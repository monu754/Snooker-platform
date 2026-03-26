import { NextResponse } from "next/server.js";
import { isProductionRuntime } from "./runtime-config.ts";
import { getSecurityHeadersForRuntime } from "./security-headers.js";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export function enforceTrustedOrigin(req: Request) {
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (!host) {
    return null;
  }

  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
  }

  if (!origin && referer) {
    try {
      if (new URL(referer).host !== host) {
        return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
  }

  return null;
}

export function validateImageUpload(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, and WebP image uploads are allowed.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Image uploads must be 5MB or smaller.");
  }
}

export function getSecurityHeaders() {
  return getSecurityHeadersForRuntime(isProductionRuntime());
}
