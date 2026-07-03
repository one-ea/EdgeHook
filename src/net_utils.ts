export function isIP(value: string): boolean {
  return isIPv4String(value) || isIPv6String(value);
}

function isIPv4String(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function isIPv6String(value: string): boolean {
  return value.includes(":") && value.split(":").length >= 2;
}
