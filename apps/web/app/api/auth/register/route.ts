import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { logError } from "../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../lib/security";
import { getPlatformSettings } from "../../../../lib/settings";
import { ValidationError, runRegistrationWorkflow } from "../../../../lib/workflows/registration";

export async function POST(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const rateLimitResponse = await applyRateLimit(req, "register", 5, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const settings = await getPlatformSettings();
    if (settings.maintenanceMode) {
      return jsonError("Registration is temporarily unavailable during maintenance mode.", 503);
    }

    if (!settings.allowRegistration) {
      return jsonError("Registration is currently disabled by the administrator.", 403);
    }

    await dbConnect();
    const result = await runRegistrationWorkflow(await req.json(), settings, {
      findExistingUser: (email) => User.findOne({ email }),
      createUser: (input) =>
        User.create({
          name: input.name,
          email: input.email,
          password: input.password,
        }),
      hashPassword: (password) => bcrypt.hash(password, 10),
    });
    return NextResponse.json(result.body, { status: result.status });

  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("auth.register.failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
