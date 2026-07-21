export type MetricValueSize = "standard" | "compact";

export function getMetricValueSize(value: string): MetricValueSize {
  return value.length >= 5 ? "compact" : "standard";
}
