import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { authOptions } from "../../../../lib/auth";
import { logError } from "../../../../lib/logger";
import { jsonError } from "../../../../lib/request";
import { isMaintenanceModeEnabled } from "../../../../lib/settings";
import { ValidationError, validateProfileUpdateInput } from "../../../../lib/validation";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne(
      { email: (session.user as any).email },
      { name: 1, email: 1, role: 1, image: 1, createdAt: 1, updatedAt: 1 },
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image || "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: unknown) {
    logError("profile.fetch_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Profile updates are temporarily unavailable during maintenance mode.", 503);
    }

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, password } = validateProfileUpdateInput(await req.json());

    await dbConnect();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: (session.user as any).email },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("profile.update_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
