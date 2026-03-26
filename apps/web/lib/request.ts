import { NextResponse } from "next/server";
import { consumeRateLimit } from "./rate-limit";
import { incrementMetric } from "./metrics.ts";

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function applyRateLimit(
  req: Request,
  namespace: string,
  limit: number,
  windowMs: number,
  suffix = "",
) {
  const ip = getClientIp(req);
  const result = await consumeRateLimit({
    key: `${namespace}:${ip}:${suffix}`,
    limit,
    windowMs,
  });

  incrementMetric(`rate_limit_checks_total.${result.driver}.${namespace}.${result.allowed ? "allowed" : "blocked"}`);

  if (result.allowed) {
    return null;
  }

  incrementMetric(`rate_limit_hits_total.${namespace}`);

  return NextResponse.json(
    {
      error: "Too many requests. Please wait and try again.",
      retryAfterSeconds: Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1),
    },
    {
      status: 429,
      headers: {
        "Retry-After": `${Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1)}`,
        "X-RateLimit-Driver": result.driver,
        "X-RateLimit-Namespace": namespace,
      },
    },
  );
}
