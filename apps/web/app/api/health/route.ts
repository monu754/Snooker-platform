export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "../../../lib/mongodb";
import { authOptions } from "../../../lib/auth";
import { getConfiguredUploadStorageMode, getRuntimeConfigurationIssues } from "../../../lib/runtime-config";
import { logError } from "../../../lib/logger";
import { getMetricsSnapshot, recordApiMetric } from "../../../lib/metrics";

export async function GET() {
  const startedAt = Date.now();
  const configIssues = getRuntimeConfigurationIssues();
  const uploadMode = getConfiguredUploadStorageMode();
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  try {
    await dbConnect();
    recordApiMetric("health_get", 200, Date.now() - startedAt);
    return NextResponse.json(
      {
        success: true,
        status: configIssues.length === 0 ? "ok" : "warning",
        timestamp: new Date().toISOString(),
        services: {
          database: "ok",
        },
        configuration: {
          uploadStorageMode: uploadMode,
          issueCount: configIssues.length,
          ...(isAdmin
            ? {
                issues: configIssues,
                rateLimitDriver:
                  process.env.RATE_LIMIT_DRIVER === "memory" ? "memory" : "mongo-with-memory-fallback",
              }
            : {}),
        },
        ...(isAdmin ? { metrics: getMetricsSnapshot() } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    logError("health.check_failed", error);
    recordApiMetric("health_get", 503, Date.now() - startedAt);
    return NextResponse.json(
      {
        success: false,
        status: "degraded",
        timestamp: new Date().toISOString(),
        services: {
          database: "error",
        },
        configuration: {
          uploadStorageMode: uploadMode,
          issueCount: configIssues.length,
          ...(isAdmin
            ? {
                issues: configIssues,
                rateLimitDriver:
                  process.env.RATE_LIMIT_DRIVER === "memory" ? "memory" : "mongo-with-memory-fallback",
              }
            : {}),
        },
        ...(isAdmin ? { metrics: getMetricsSnapshot() } : {}),
      },
      { status: 503 },
    );
  }
}
