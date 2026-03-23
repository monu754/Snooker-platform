import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { logError } from "../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../lib/request";
import { getPlatformSettings } from "../../../../lib/settings";
import { ValidationError, validateRegistrationInput } from "../../../../lib/validation";

export async function POST(req: Request) {
  try {
    const rateLimitResponse = applyRateLimit(req, "register", 5, 60_000);
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

    const { name, email, password } = validateRegistrationInput(await req.json());
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the standard user (Role defaults to "user" inside the User model)
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return NextResponse.json({ 
      success: true, 
      message: "User registered successfully", 
      userId: newUser._id 
    }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("auth.register.failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
