import { isIP } from "./net_utils";

export interface IpWhitelist {
  allowedCIDRs: string[];
}

const DEFAULT_CIDRS: string[] = [];

export function isIpAllowed(ip: string, cidrs: string[] = DEFAULT_CIDRS): boolean {
  if (cidrs.length === 0) {
    return true;
  }

  if (isIP(ip)) {
    for (const cidr of cidrs) {
      if (ipMatchesCIDR(ip, cidr)) {
        return true;
      }
    }
  }

  return false;
}

function ipMatchesCIDR(ip: string, cidr: string): boolean {
  if (cidr === "0.0.0.0/0" || cidr === "::/0") {
    return true;
  }

  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);

  if (isNaN(bits)) {
    return ip === range;
  }

  if (isIPv4(ip) && isIPv4(range)) {
    return ipv4MatchesCIDR(ip, range, bits);
  }

  if (isIPv6(ip) && isIPv6(range)) {
    return ipv6MatchesCIDR(ip, range, bits);
  }

  return false;
}

function isIPv4(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

function isIPv6(ip: string): boolean {
  return ip.includes(":");
}

function ipv4MatchesCIDR(ip: string, range: string, bits: number): boolean {
  const ipNum = ipv4ToNumber(ip);
  const rangeNum = ipv4ToNumber(range);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;

  return (ipNum & mask) === (rangeNum & mask);
}

function ipv4ToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function ipv6MatchesCIDR(ip: string, range: string, _bits: number): boolean {
  return ip === range;
}
