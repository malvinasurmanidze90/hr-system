/**
 * Extracts the tenant slug from a hostname.
 *
 * Rules:
 *  - hrapp.org, www.hrapp.org, localhost → null (main platform)
 *  - *.vercel.app preview URLs           → null (CI previews)
 *  - anything.hrapp.org                  → "anything" (tenant slug)
 *
 * Local dev tip: Chrome resolves `tenant.localhost` natively.
 * Add `127.0.0.1 tenant.localhost` to /etc/hosts on Mac/Linux
 * or %SystemRoot%\System32\drivers\etc\hosts on Windows.
 */
export function getTenantSlug(hostname: string): string | null {
  const host = hostname.split(':')[0].toLowerCase().trim();

  // Exact main-domain matches
  if (host === 'hrapp.org' || host === 'www.hrapp.org' || host === 'localhost') {
    return null;
  }

  // Vercel preview deployments
  if (host.endsWith('.vercel.app')) return null;

  // Subdomain of hrapp.org
  if (host.endsWith('.hrapp.org')) {
    const sub = host.slice(0, host.length - '.hrapp.org'.length);
    if (!sub || sub === 'www') return null;
    return sub;
  }

  // Local dev: tenant.localhost (Chrome-native subdomain routing)
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, host.length - '.localhost'.length);
    if (!sub) return null;
    return sub;
  }

  return null;
}
