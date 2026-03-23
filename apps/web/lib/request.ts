import { NextResponse } from "next/server";
import { consumeRateLimit } from "./rate-limit";

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

export function applyRateLimit(
  req: Request,
  namespace: string,
  limit: number,
  windowMs: number,
  suffix = "",
) {
  const ip = getClientIp(req);
  const result = consumeRateLimit({
    key: `${namespace}:${ip}:${suffix}`,
    limit,
    windowMs,
  });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Too many requests. Please wait and try again.",
      retryAfterSeconds: Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1),
    },
    {
      status: 429,
      headers: {
        "Retry-After": `${Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1)}`,
      },
    },
  );
}
