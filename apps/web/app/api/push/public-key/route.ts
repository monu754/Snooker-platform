import { NextResponse } from "next/server";
import { getPublicVapidKey, isPushConfigured } from "../../../../lib/push";

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  }

  return NextResponse.json({ publicKey: getPublicVapidKey() }, { status: 200 });
}
