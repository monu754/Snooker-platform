export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getMetricsSnapshot, getPrometheusMetricsText, recordApiMetric } from "../../../lib/metrics";
import { jsonError } from "../../../lib/request";

export async function GET(req: Request) {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== "admin") {
      recordApiMetric("metrics_get", 401, Date.now() - startedAt);
      return jsonError("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    if (format === "json") {
      recordApiMetric("metrics_get", 200, Date.now() - startedAt);
      return NextResponse.json({ success: true, metrics: getMetricsSnapshot() }, { status: 200 });
    }

    recordApiMetric("metrics_get", 200, Date.now() - startedAt);
    return new NextResponse(getPrometheusMetricsText(), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      },
    });
  } catch {
    recordApiMetric("metrics_get", 500, Date.now() - startedAt);
    return jsonError("Unable to load metrics.", 500);
  }
}
