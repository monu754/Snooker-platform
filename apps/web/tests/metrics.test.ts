import test from "node:test";
import assert from "node:assert/strict";

import { getMetricsSnapshot, getPrometheusMetricsText, incrementMetric, observeMetric, recordApiMetric } from "../lib/metrics.ts";

test("metrics snapshot records counters and histogram stats", () => {
  incrementMetric("test_counter", 2);
  observeMetric("test_latency_ms", 10);
  observeMetric("test_latency_ms", 30);
  recordApiMetric("demo_route", 200, 25);

  const snapshot = getMetricsSnapshot();
  const counter = snapshot.counters.test_counter;
  const apiCounter = snapshot.counters["api_requests_total.demo_route.200"];
  const histogram = snapshot.histograms.test_latency_ms;

  assert.ok(counter !== undefined);
  assert.ok(apiCounter !== undefined);
  assert.ok(histogram !== undefined);
  assert.equal(counter >= 2, true);
  assert.equal(apiCounter >= 1, true);
  assert.equal(histogram.count >= 2, true);
  assert.equal(histogram.min, 10);
  assert.equal(histogram.max, 30);
  assert.equal(histogram.avg, 20);
  assert.equal(typeof snapshot.process.nodeVersion, "string");
});

test("prometheus formatter exposes process and custom metrics", () => {
  incrementMetric("another_counter", 1);
  observeMetric("another_duration_ms", 15);

  const text = getPrometheusMetricsText();

  assert.match(text, /snooker_uptime_seconds/);
  assert.match(text, /snooker_process_rss_bytes/);
  assert.match(text, /another_counter/);
  assert.match(text, /another_duration_ms_count/);
});
