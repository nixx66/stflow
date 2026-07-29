export function cashflowWidth(amount: bigint, total: bigint) {
  if (amount <= 0n || total <= 0n) return "0%";
  const basisPoints = amount >= total ? 10_000n : (amount * 10_000n) / total;
  const whole = basisPoints / 100n;
  const fraction = (basisPoints % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}%`;
}
