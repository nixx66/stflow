const USDC_SCALE = 1_000_000n;

export function shortenAddress(value?: string, chars = 4) {
  if (!value) return "Not connected";
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}...${value.slice(-chars)}`;
}

export function parseUsdc(value: string) {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!match) throw new Error("Invalid USDC amount.");
  return BigInt(match[1]) * USDC_SCALE + BigInt((match[2] ?? "").padEnd(6, "0"));
}

function formatRawUsdc(raw: bigint) {
  const sign = raw < 0n ? "-" : "";
  const absolute = raw < 0n ? -raw : raw;
  const whole = (absolute / USDC_SCALE)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % USDC_SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function formatCurrency(amount: string | number | bigint, currency = "USDC") {
  let raw: bigint;
  try {
    raw =
      typeof amount === "bigint"
        ? amount
        : parseUsdc(typeof amount === "number" ? amount.toString() : amount);
  } catch {
    return `${amount} ${currency}`;
  }
  return `${formatRawUsdc(raw)} ${currency}`;
}

export function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function copyToClipboard(value: string) {
  if (!navigator?.clipboard) return Promise.resolve();
  return navigator.clipboard.writeText(value);
}
