type SecurityEvent =
  | 'auth_failure'
  | 'auth_success'
  | 'registration'
  | 'logout'
  | 'scan_requested'
  | 'scan_completed'
  | 'scan_rejected'
  | 'rate_limited'
  | 'provider_status'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | '2fa_challenge_issued'
  | 'auth_success_2fa'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'session_revoked';

// Deliberately accepts only caller-selected scalar metadata. Do not pass request
// objects, URLs, headers, credentials, provider bodies, or error stacks here.
export function logSecurityEvent(
  event: SecurityEvent,
  details: Record<string, string | number | boolean | undefined> = {}
) {
  const metadata = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined)
  );

  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...metadata,
    })
  );
}