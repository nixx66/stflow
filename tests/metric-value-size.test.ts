import assert from "node:assert/strict";
import test from "node:test";

import { getMetricValueSize } from "../lib/metric-value-size.ts";

test("uses compact sizing for metric values with five or more display characters", () => {
  assert.equal(getMetricValueSize("4,450"), "compact");
  assert.equal(getMetricValueSize("98.4"), "standard");
  assert.equal(getMetricValueSize("12"), "standard");
});
