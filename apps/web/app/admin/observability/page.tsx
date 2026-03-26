"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Server } from "lucide-react";

type HealthResponse = {
  success: boolean;
  status: string;
  timestamp: string;
  services: Record<string, string>;
  configuration: {
    uploadStorageMode: string;
    issues: string[];
    rateLimitDriver?: string;
  };
};

type MetricsResponse = {
  success: boolean;
  metrics: {
    uptimeSeconds: number;
    counters: Record<string, number>;
    histograms: Record<string, { count: number; sum: number; min: number; max: number; avg: number }>;
    process: {
      rssBytes: number;
      heapUsedBytes: number;
      heapTotalBytes: number;
      nodeVersion: string;
      pid: number;
    };
    rateLimits: {
      totals: {
        allowed: number;
        blocked: number;
        fallbacks: number;
      };
      byNamespace: Array<{
        namespace: string;
        memoryAllowed: number;
        memoryBlocked: number;
        mongoAllowed: number;
        mongoBlocked: number;
        totalAllowed: number;
        totalBlocked: number;
        fallbackCount: number;
      }>;
    };
  };
};

export default function ObservabilityPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse["metrics"] | null>(null);

  useEffect(() => {
    const load = async () => {
      const [healthRes, metricsRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/metrics?format=json", { cache: "no-store" }),
      ]);

      const healthJson = await healthRes.json().catch(() => null);
      const metricsJson = await metricsRes.json().catch(() => null);
      setHealth(healthJson);
      setMetrics(metricsJson?.metrics || null);
    };

    load().catch(() => {});
    const interval = window.setInterval(() => {
      load().catch(() => {});
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Observability</h1>
        <p className="mt-2 text-zinc-400">Runtime health, process metrics, configuration warnings, and route activity.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Panel
          title="Runtime Health"
          icon={<Activity className="text-emerald-400" size={18} />}
          body={
            <div className="space-y-3 text-sm">
              <p>Status: <span className="font-semibold text-white">{health?.status || "Loading..."}</span></p>
              <p>Database: <span className="font-semibold text-white">{health?.services?.database || "Unknown"}</span></p>
              <p>Upload Mode: <span className="font-semibold text-white">{health?.configuration?.uploadStorageMode || "Unknown"}</span></p>
              <p>Rate Limit Driver: <span className="font-semibold text-white">{health?.configuration?.rateLimitDriver || "Unknown"}</span></p>
            </div>
          }
        />
        <Panel
          title="Process Metrics"
          icon={<Server className="text-blue-400" size={18} />}
          body={
            <div className="space-y-3 text-sm">
              <p>Uptime: <span className="font-semibold text-white">{metrics ? `${metrics.uptimeSeconds}s` : "Loading..."}</span></p>
              <p>RSS: <span className="font-semibold text-white">{metrics ? formatBytes(metrics.process.rssBytes) : "Loading..."}</span></p>
              <p>Heap Used: <span className="font-semibold text-white">{metrics ? formatBytes(metrics.process.heapUsedBytes) : "Loading..."}</span></p>
              <p>Node: <span className="font-semibold text-white">{metrics?.process.nodeVersion || "Loading..."}</span></p>
            </div>
          }
        />
        <Panel
          title="Config Warnings"
          icon={<AlertTriangle className="text-amber-400" size={18} />}
          body={
            <div className="space-y-2 text-sm">
              {health?.configuration?.issues?.length ? (
                health.configuration.issues.map((issue) => (
                  <div key={issue} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-300">
                    {issue}
                  </div>
                ))
              ) : (
                <p className="text-emerald-400">No configuration warnings detected.</p>
              )}
            </div>
          }
        />
        <Panel
          title="Rate Limiting"
          icon={<BarChart3 className="text-rose-400" size={18} />}
          body={
            <div className="space-y-3 text-sm">
              <p>Allowed Checks: <span className="font-semibold text-white">{metrics?.rateLimits?.totals.allowed ?? "Loading..."}</span></p>
              <p>Blocked Checks: <span className="font-semibold text-white">{metrics?.rateLimits?.totals.blocked ?? "Loading..."}</span></p>
              <p>Fallbacks: <span className="font-semibold text-white">{metrics?.rateLimits?.totals.fallbacks ?? "Loading..."}</span></p>
            </div>
          }
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Counters"
          icon={<BarChart3 className="text-emerald-400" size={18} />}
          body={<MetricTable entries={metrics?.counters || {}} />}
        />
        <Panel
          title="Latency Histograms"
          icon={<BarChart3 className="text-purple-400" size={18} />}
          body={<HistogramTable entries={metrics?.histograms || {}} />}
        />
      </div>

      <div className="mt-8">
        <Panel
          title="Rate Limit Namespaces"
          icon={<BarChart3 className="text-rose-400" size={18} />}
          body={<RateLimitTable entries={metrics?.rateLimits?.byNamespace || []} />}
        />
      </div>
    </div>
  );
}

function Panel({ title, icon, body }: { title: string; icon: React.ReactNode; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      {body}
    </div>
  );
}

function MetricTable({ entries }: { entries: Record<string, number> }) {
  const rows = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No metrics recorded yet.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {rows.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
          <span className="text-zinc-300">{key}</span>
          <span className="font-semibold text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function HistogramTable({ entries }: { entries: Record<string, { count: number; sum: number; min: number; max: number; avg: number }> }) {
  const rows = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No latency metrics recorded yet.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {rows.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
          <div className="mb-2 font-medium text-zinc-200">{key}</div>
          <div className="grid grid-cols-2 gap-2 text-zinc-400">
            <span>count: {value.count}</span>
            <span>avg: {value.avg}ms</span>
            <span>min: {value.min}ms</span>
            <span>max: {value.max}ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RateLimitTable({
  entries,
}: {
  entries: Array<{
    namespace: string;
    memoryAllowed: number;
    memoryBlocked: number;
    mongoAllowed: number;
    mongoBlocked: number;
    totalAllowed: number;
    totalBlocked: number;
    fallbackCount: number;
  }>;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500">No rate-limit activity recorded yet.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {entries.map((entry) => (
        <div key={entry.namespace} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-zinc-200">{entry.namespace}</span>
            <span className="text-zinc-400">blocked {entry.totalBlocked}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-zinc-400 lg:grid-cols-4">
            <span>mongo allow: {entry.mongoAllowed}</span>
            <span>mongo block: {entry.mongoBlocked}</span>
            <span>memory allow: {entry.memoryAllowed}</span>
            <span>memory block: {entry.memoryBlocked}</span>
            <span>total allow: {entry.totalAllowed}</span>
            <span>total block: {entry.totalBlocked}</span>
            <span>fallbacks: {entry.fallbackCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
