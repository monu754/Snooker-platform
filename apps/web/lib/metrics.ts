type CounterMap = Map<string, number>;
type HistogramEntry = {
  count: number;
  sum: number;
  min: number;
  max: number;
};

type HistogramMap = Map<string, HistogramEntry>;

type MetricsStore = {
  startedAt: number;
  counters: CounterMap;
  histograms: HistogramMap;
};

declare global {
  var __snookerMetricsStore: MetricsStore | undefined;
}

function getMetricsStore(): MetricsStore {
  if (!globalThis.__snookerMetricsStore) {
    globalThis.__snookerMetricsStore = {
      startedAt: Date.now(),
      counters: new Map(),
      histograms: new Map(),
    };
  }

  return globalThis.__snookerMetricsStore;
}

export function incrementMetric(name: string, amount = 1) {
  const store = getMetricsStore();
  store.counters.set(name, (store.counters.get(name) || 0) + amount);
}

export function observeMetric(name: string, value: number) {
  const store = getMetricsStore();
  const current = store.histograms.get(name) || {
    count: 0,
    sum: 0,
    min: value,
    max: value,
  };

  current.count += 1;
  current.sum += value;
  current.min = Math.min(current.min, value);
  current.max = Math.max(current.max, value);
  store.histograms.set(name, current);
}

export function recordApiMetric(routeName: string, statusCode: number, durationMs: number) {
  incrementMetric(`api_requests_total.${routeName}.${statusCode}`);
  observeMetric(`api_request_duration_ms.${routeName}`, durationMs);
}

export function getCounterValue(name: string) {
  return getMetricsStore().counters.get(name) || 0;
}

export function getHistogramValue(name: string) {
  const value = getMetricsStore().histograms.get(name);
  if (!value) {
    return null;
  }

  return {
    ...value,
    avg: value.count > 0 ? Number((value.sum / value.count).toFixed(2)) : 0,
  };
}

export function getCountersByPrefix(prefix: string) {
  return Object.fromEntries(
    Array.from(getMetricsStore().counters.entries()).filter(([key]) => key.startsWith(prefix)),
  );
}

export function getRateLimitSnapshot() {
  const counters = getCountersByPrefix("rate_limit_");
  const namespaces = new Set<string>();

  for (const key of Object.keys(counters)) {
    const parts = key.split(".");
    const namespace = parts[2];
    if (parts.length >= 3 && namespace) {
      namespaces.add(namespace);
    }
  }

  const byNamespace = Array.from(namespaces)
    .sort((a, b) => a.localeCompare(b))
    .map((namespace) => {
      const allowedMemory = getCounterValue(`rate_limit_checks_total.memory.${namespace}.allowed`);
      const blockedMemory = getCounterValue(`rate_limit_checks_total.memory.${namespace}.blocked`);
      const allowedMongo = getCounterValue(`rate_limit_checks_total.mongo.${namespace}.allowed`);
      const blockedMongo = getCounterValue(`rate_limit_checks_total.mongo.${namespace}.blocked`);
      const fallbackCount = getCounterValue(`rate_limit_fallbacks_total.${namespace}`);

      return {
        namespace,
        memoryAllowed: allowedMemory,
        memoryBlocked: blockedMemory,
        mongoAllowed: allowedMongo,
        mongoBlocked: blockedMongo,
        totalAllowed: allowedMemory + allowedMongo,
        totalBlocked: blockedMemory + blockedMongo,
        fallbackCount,
      };
    });

  return {
    totals: {
      allowed: byNamespace.reduce((sum, entry) => sum + entry.totalAllowed, 0),
      blocked: byNamespace.reduce((sum, entry) => sum + entry.totalBlocked, 0),
      fallbacks: byNamespace.reduce((sum, entry) => sum + entry.fallbackCount, 0),
    },
    byNamespace,
  };
}

export function getMetricsSnapshot() {
  const store = getMetricsStore();

  return {
    startedAt: new Date(store.startedAt).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - store.startedAt) / 1000),
    counters: Object.fromEntries(store.counters.entries()),
    histograms: Object.fromEntries(
      Array.from(store.histograms.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          avg: value.count > 0 ? Number((value.sum / value.count).toFixed(2)) : 0,
        },
      ]),
    ),
    process: {
      rssBytes: process.memoryUsage().rss,
      heapUsedBytes: process.memoryUsage().heapUsed,
      heapTotalBytes: process.memoryUsage().heapTotal,
      nodeVersion: process.version,
      pid: process.pid,
    },
    rateLimits: getRateLimitSnapshot(),
  };
}

export function getPrometheusMetricsText() {
  const snapshot = getMetricsSnapshot();
  const lines: string[] = [];

  lines.push(`# HELP snooker_uptime_seconds Process uptime in seconds`);
  lines.push(`# TYPE snooker_uptime_seconds gauge`);
  lines.push(`snooker_uptime_seconds ${snapshot.uptimeSeconds}`);

  lines.push(`# HELP snooker_process_rss_bytes Resident set size in bytes`);
  lines.push(`# TYPE snooker_process_rss_bytes gauge`);
  lines.push(`snooker_process_rss_bytes ${snapshot.process.rssBytes}`);

  lines.push(`# HELP snooker_process_heap_used_bytes Heap used in bytes`);
  lines.push(`# TYPE snooker_process_heap_used_bytes gauge`);
  lines.push(`snooker_process_heap_used_bytes ${snapshot.process.heapUsedBytes}`);

  for (const [key, value] of Object.entries(snapshot.counters)) {
    const metricName = key.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`# TYPE ${metricName} counter`);
    lines.push(`${metricName} ${value}`);
  }

  for (const [key, value] of Object.entries(snapshot.histograms)) {
    const metricName = key.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`# TYPE ${metricName}_count counter`);
    lines.push(`${metricName}_count ${value.count}`);
    lines.push(`# TYPE ${metricName}_sum gauge`);
    lines.push(`${metricName}_sum ${value.sum}`);
    lines.push(`# TYPE ${metricName}_min gauge`);
    lines.push(`${metricName}_min ${value.min}`);
    lines.push(`# TYPE ${metricName}_max gauge`);
    lines.push(`${metricName}_max ${value.max}`);
    lines.push(`# TYPE ${metricName}_avg gauge`);
    lines.push(`${metricName}_avg ${value.avg}`);
  }

  return `${lines.join("\n")}\n`;
}
