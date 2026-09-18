import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export class AnalyticsController {
  static async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const scans = await prisma.scan.findMany({
        where: { userId },
        include: { result: true },
      });

      const totalScans = scans.length;
      let threatsDetected = 0;
      let safeScans = 0;
      let totalRiskScore = 0;

      scans.forEach(scan => {
        if (scan.result) {
          totalRiskScore += scan.result.riskScore;
          if (scan.result.classification === 'SAFE') {
            safeScans++;
          } else {
            threatsDetected++;
          }
        }
      });

      const averageRiskScore = totalScans > 0 ? Math.round(totalRiskScore / totalScans) : 0;

      const weeklyNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyTotals = new Map(weeklyNames.map((name) => [name, 0]));
      scans.forEach((scan) => {
        const day = weeklyNames[new Date(scan.createdAt).getDay()];
        weeklyTotals.set(day, (weeklyTotals.get(day) || 0) + 1);
      });
      const weeklyActivity = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => ({
        name,
        value: weeklyTotals.get(name) || 0,
      }));

      // Threat distribution
      const phishing = scans.filter(s => s.result?.classification === 'PHISHING').length;
      const scam = scans.filter(s => s.result?.classification === 'SCAM').length;
      const malicious = scans.filter(s => s.result?.classification === 'MALICIOUS').length;
      const suspicious = scans.filter(s => s.result?.classification === 'SUSPICIOUS').length;

      const threatDistribution = [
        { name: 'Phishing', value: phishing },
        { name: 'Scam', value: scam },
        { name: 'Malware', value: malicious },
        { name: 'Suspicious', value: suspicious },
      ];

      const recentScans = await prisma.scan.findMany({
        where: { userId },
        include: { result: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      res.status(200).json({
        success: true,
        data: {
          totalScans,
          threatsDetected,
          safeScans,
          averageRiskScore,
          weeklyActivity,
          threatDistribution,
          recentScans
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
