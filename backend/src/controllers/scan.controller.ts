import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import prisma from '../utils/prisma';
import { analyzeUrl } from '../services/url-analysis.service';
import { VirusTotalProvider } from '../services/virustotal.provider';
import { GoogleWebRiskProvider } from '../services/google-web-risk.provider';
import { inspectInfrastructure } from '../services/infrastructure-intelligence.service';
import { aggregateRisk } from '../services/risk-aggregation.service';
import { ExternalThreatIntelligence } from '../services/threat-intelligence.provider';
import { AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';
import { isOwnedBy } from '../utils/ownership';

const scanSchema = z.object({
  url: z.string().trim().min(1).max(2048),
}).strict();

const scanIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid scan ID',
);

export class ScanController {
  static async createScan(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { url } = scanSchema.parse(req.body);
      const userId = req.userId!;

      const analysis = analyzeUrl(url);

      const providers = [
        new VirusTotalProvider(),
        new GoogleWebRiskProvider(),
      ];

      console.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'scan_requested',
          userId,
        }),
      );

      const pendingScan =
        await prisma.scan.create({
          data: {
            userId,
            input: analysis.normalizedUrl,
            inputType: 'URL',
            target: analysis.normalizedUrl,
            status: 'PENDING',
          },
        });

      try {
        await prisma.scan.update({
          where: {
            id: pendingScan.id,
          },
          data: {
            status: 'ANALYZING',
          },
        });

        const infrastructure =
          await inspectInfrastructure(
            analysis.normalizedUrl,
            analysis.hostname,
          );

        const externalLookupAllowed =
          infrastructure.dns.status === 'COMPLETED';

        const providerResults =
          externalLookupAllowed
            ? await Promise.allSettled(
                providers.map((provider) =>
                  provider.lookupUrl(
                    analysis.normalizedUrl,
                  ),
                ),
              )
            : [];

        const externalResults: ExternalThreatIntelligence[] =
          externalLookupAllowed
            ? providerResults.map(
                (result, index) =>
                  result.status === 'fulfilled'
                    ? result.value
                    : {
                        provider:
                          providers[index].getStatus()
                            .provider,
                        status: 'ERROR' as const,
                        malicious: null,
                        suspicious: null,
                        harmless: null,
                        undetected: null,
                        timeout: null,
                        reputation: null,
                        categories: [],
                        detections: [],
                        threatTypes: [],
                        expireTime: null,
                        queriedAt:
                          new Date().toISOString(),
                        lastAnalysisAt: null,
                        confidence: null,
                        message:
                          'The external provider failed without exposing an internal error.',
                      },
              )
            : providers.map((provider) => ({
                provider:
                  provider.getStatus().provider,
                status: 'UNAVAILABLE' as const,
                malicious: null,
                suspicious: null,
                harmless: null,
                undetected: null,
                timeout: null,
                reputation: null,
                categories: [],
                detections: [],
                threatTypes: [],
                expireTime: null,
                queriedAt:
                  new Date().toISOString(),
                lastAnalysisAt: null,
                confidence: null,
                message:
                  'External provider lookup was not performed because target DNS validation did not return a public address.',
              }));

        const aggregated = aggregateRisk(
          analysis,
          externalResults,
          infrastructure,
        );

        const riskLevel =
          aggregated.verdict === 'DANGEROUS'
            ? 'HIGH'
            : aggregated.verdict === 'SUSPICIOUS'
              ? 'MEDIUM'
              : 'LOW';

        const classification =
          aggregated.verdict === 'DANGEROUS'
            ? 'MALICIOUS'
            : aggregated.verdict;

        const scan =
          await prisma.scan.update({
            where: {
              id: pendingScan.id,
            },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),

              result: {
                create: {
                  riskScore:
                    aggregated.riskScore,
                  riskLevel,
                  classification,
                  confidence:
                    aggregated.confidence,
                  explanation:
                    aggregated.explanation,
                  recommendation:
                    aggregated.recommendation,

                  analysis: {
                    hostname:
                      analysis.hostname,
                    localScore:
                      analysis.riskScore,
                    verdict:
                      aggregated.verdict,
                    confidence:
                      aggregated.confidence,
                    evidenceQuality:
                      aggregated.evidenceQuality,
                    reasons:
                      aggregated.reasons,
                    evidenceSummary: {
                      localSignals:
                        analysis.signals.length,
                      externalProvidersAvailable:
                        aggregated
                          .externalIntelligence
                          .externalProvidersAvailable,
                      externalProvidersFound:
                        aggregated
                          .externalIntelligence
                          .externalProvidersFound,
                      agreement:
                        aggregated
                          .externalIntelligence
                          .agreement,
                      conflicts:
                        aggregated
                          .externalIntelligence
                          .conflicts,
                      infrastructureStatus:
                        infrastructure.status,
                    },
                    infrastructureIntelligence:
                      aggregated.infrastructureIntelligence,
                    signals:
                      analysis.signals.map(
                        (signal) => ({
                          ...signal,
                        }),
                      ),
                  } as unknown as Prisma.InputJsonObject,

                  externalIntelligence:
                    aggregated.externalIntelligence as unknown as Prisma.InputJsonObject,
                },
              },

              indicators: {
                create: analysis.signals.map(
                  (signal) => ({
                    indicator: signal.type,
                    description:
                      `${signal.severity}: ${signal.message}`,
                  }),
                ),
              },
            },

            include: {
              result: true,
              indicators: true,
            },
          });

        io.to(userId).emit(
          'scan.completed',
          scan,
        );

        console.info(
          JSON.stringify({
            timestamp:
              new Date().toISOString(),
            event: 'scan_completed',
            userId,
            scanId: scan.id,
            riskScore:
              aggregated.riskScore,
          }),
        );

        res.status(201).json({
          success: true,
          data: scan,
        });
      } catch (error) {
        await prisma.scan.update({
          where: {
            id: pendingScan.id,
          },
          data: {
            status: 'FAILED',
          },
        }).catch(() => undefined);

        throw error;
      }
    } catch (error: any) {
      if (
        error?.code === 'UNSAFE_TARGET' ||
        error?.code === 'INVALID_URL' ||
        error?.code === 'UNSUPPORTED_PROTOCOL'
      ) {
        console.info(
          JSON.stringify({
            timestamp:
              new Date().toISOString(),
            event: 'scan_rejected',
            reason: error.code,
          }),
        );
      }

      next(error);
    }
  }

  static async getScans(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.userId!;

      const scans =
        await prisma.scan.findMany({
          where: {
            userId,
          },
          include: {
            result: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      res.status(200).json({
        success: true,
        data: scans,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScanById(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.userId!;
      const id = scanIdSchema.parse(
        req.params.id,
      );

      const scan =
        await prisma.scan.findUnique({
          where: {
            id,
          },
          include: {
            result: true,
            indicators: true,
          },
        });

      if (!scan) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Scan not found',
          },
        });
        return;
      }

      if (
        !isOwnedBy(
          scan.userId,
          userId,
        )
      ) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: scan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteScan(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.userId!;
      const id = scanIdSchema.parse(
        req.params.id,
      );

      const scan =
        await prisma.scan.findUnique({
          where: {
            id,
          },
        });

      if (!scan) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Scan not found',
          },
        });
        return;
      }

      if (
        !isOwnedBy(
          scan.userId,
          userId,
        )
      ) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
        return;
      }

      /*
       * MongoDB local Docker deployments may be standalone
       * servers rather than replica sets. Avoid requiring a
       * MongoDB transaction for this deletion.
       */
      await prisma.threatIndicator.deleteMany({
        where: {
          scanId: id,
        },
      });

      await prisma.scanResult.deleteMany({
        where: {
          scanId: id,
        },
      });

      await prisma.scan.delete({
        where: {
          id,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Scan deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}