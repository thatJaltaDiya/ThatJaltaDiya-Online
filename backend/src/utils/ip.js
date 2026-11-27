import net from 'net';

/**
 * Official Cloudflare Published IP Ranges (IPv4 & IPv6)
 * https://www.cloudflare.com/ips/
 */
const CLOUDFLARE_IPV4_CIDRS = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

const CLOUDFLARE_IPV6_PREFIXES = [
  '2400:cb00:',
  '2606:4700:',
  '2803:f800:',
  '2405:b500:',
  '2405:8100:',
  '2a06:98c0:',
  '2c0f:f248:',
];

// Helper to convert IPv4 string to 32-bit unsigned integer
function ipv4ToInt(ip) {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

// Check if an IPv4 address is in a CIDR block
function isIpv4InCidr(ip, cidr) {
  const [range, bits = '32'] = cidr.split('/');
  const mask = bits === '0' ? 0 : (~0 << (32 - parseInt(bits, 10))) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

// Check if an IP comes from Cloudflare
export function isCloudflareIp(ip) {
  if (!ip) return false;

  // Clean IPv6-mapped IPv4 e.g. "::ffff:104.16.1.1"
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  // Check IPv4
  if (net.isIPv4(cleanIp)) {
    return CLOUDFLARE_IPV4_CIDRS.some((cidr) => isIpv4InCidr(cleanIp, cidr));
  }

  // Check IPv6
  if (net.isIPv6(cleanIp)) {
    const lower = cleanIp.toLowerCase();
    return CLOUDFLARE_IPV6_PREFIXES.some((prefix) => lower.startsWith(prefix));
  }

  return false;
}

/**
 * Normalizes an IPv6 address and returns the /64 subnet prefix.
 * Rotating host addresses within the same /64 subnet maps to the exact same key.
 * e.g. "2001:0db8:85a3:0000:0000:8a2e:0370:7334" -> "2001:db8:85a3:0::/64"
 */
export function getIpv6Subnet64(ip) {
  if (!ip || typeof ip !== 'string') return '::/64';
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (net.isIPv4(cleanIp)) return cleanIp;
  if (!net.isIPv6(cleanIp)) return cleanIp;

  try {
    // Expand IPv6
    const parts = cleanIp.toLowerCase().split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts.length > 1 && parts[1] ? parts[1].split(':') : [];

    const missing = 8 - (left.length + right.length);
    const middle = Array(Math.max(0, missing)).fill('0');
    const full = [...left, ...middle, ...right];

    // Take first 4 hextets (64 bits)
    const subnetHextets = full.slice(0, 4).map((h) => h || '0');
    return subnetHextets.join(':') + '::/64';
  } catch {
    return cleanIp;
  }
}

/**
 * Normalizes IP to a rate-limiting key:
 * - IPv4: returns raw IPv4
 * - IPv6: returns /64 subnet prefix
 */
export function getIpSubnetKey(ip) {
  if (!ip) return '127.0.0.1';
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (net.isIPv4(cleanIp)) {
    return cleanIp;
  }
  if (net.isIPv6(cleanIp)) {
    return getIpv6Subnet64(cleanIp);
  }
  return cleanIp;
}

/**
 * Securely determine real client IP:
 * - Only trust `CF-Connecting-IP` if request arrived through a verified Cloudflare proxy edge
 * - Otherwise fallback to Express `req.ip`
 * - In local dev/testing, allow test IP override via x-test-client-ip
 */
export function getClientIp(req) {
  if (!req) return '127.0.0.1';

  // Test override (strictly allowed ONLY when NODE_ENV === 'test')
  if (process.env.NODE_ENV === 'test' && req.headers?.['x-test-client-ip']) {
    return req.headers['x-test-client-ip'];
  }

  const directRemoteIp = req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip;

  // Check if direct connection came from Cloudflare edge IP
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp && isCloudflareIp(directRemoteIp)) {
    const cleanCfIp = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp.split(',')[0].trim();
    if (net.isIP(cleanCfIp)) {
      return cleanCfIp;
    }
  }

  // Fallback to Express evaluated IP (respecting trust proxy)
  if (req.ip) {
    const clean = req.ip.startsWith('::ffff:') ? req.ip.slice(7) : req.ip;
    return clean;
  }

  return directRemoteIp || '127.0.0.1';
}
