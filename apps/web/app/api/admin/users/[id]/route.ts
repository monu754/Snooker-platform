import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import dbConnect from "../../../../../lib/mongodb";
import User from "../../../../../lib/models/User";
import Event from "../../../../../lib/models/Event";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const body = await req.json();
    const { role } = body;

    if (!["admin", "umpire", "user"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await dbConnect();

    // Prevent admin from demoting themselves (optional safeguard)
    if (id === (session.user as any).id) {
       return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log the update
    await Event.create({
      player: "System",
      eventType: "user_update",
      points: 0,
      description: `Role Updated for ${user.name} to ${role}`,
      category: "admin",
      frameNumber: 0
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    await dbConnect();

    // Prevent admin from deleting themselves
    if (id === (session.user as any).id) {
       return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
    }

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log the deletion
    await Event.create({
      player: "System",
      eventType: "user_deleted",
      points: 0,
      description: `User Deleted: ${user.name} (${user.email})`,
      category: "admin",
      frameNumber: 0
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
