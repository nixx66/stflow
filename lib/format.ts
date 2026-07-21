export function shortenAddress(value?: string, chars = 4) {
  if (!value) return "Not connected";
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}...${value.slice(-chars)}`;
}

export function formatCurrency(amount: string | number, currency = "USDC") {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(numeric)) return `${amount} ${currency}`;

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(numeric)} ${currency}`;
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
