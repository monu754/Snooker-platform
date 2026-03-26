import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"; // <-- NEW
import bcrypt from "bcryptjs"; // <-- NEW
import dbConnect from "./mongodb";
import User from "./models/User";
import Event from "./models/Event";
import { logError, logInfo, logWarn } from "./logger";
import { getPlatformSettings } from "./settings";
import { sanitizeStoredSubscriptionTier } from "./access";
import { isGoogleAuthConfigured } from "./runtime-config";

const providers = [];

if (isGoogleAuthConfigured()) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  );
}

providers.push(
  // Email/password stays available for privileged access and local recovery.
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      await dbConnect();
      if (!credentials?.email || !credentials?.password) {
        logWarn("auth.credentials.missing_fields");
        return null;
      }

      const user = await User.findOne({ email: credentials.email }).select("+password");

      if (!user || !user.password) {
        logWarn("auth.credentials.user_missing", { email: credentials.email });
        return null;
      }

      const settings = await getPlatformSettings();
      if (settings.maintenanceMode && user.role === "user") {
        logWarn("auth.credentials.blocked_by_maintenance", { email: credentials.email });
        return null;
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

      if (!isPasswordValid) return null;

      logInfo("auth.credentials.success", { email: user.email, role: user.role });
      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: sanitizeStoredSubscriptionTier(user.role, user.subscriptionTier),
      };
    },
  }),
);

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await dbConnect();
          const existingUser = await User.findOne({ email: user.email });
          const settings = await getPlatformSettings();
          if (!existingUser && !settings.allowRegistration) {
            return false;
          }
          if (settings.maintenanceMode && (!existingUser || existingUser.role === "user")) {
            return false;
          }

          if (!existingUser) {
            await User.create({ name: user.name, email: user.email, image: user.image, role: "user" });
          }
          return true;
        } catch (error: unknown) {
          logError("auth.google.sign_in_failed", error, { email: user.email });
          return false;
        }
      }
      return true; // Let Credentials login pass through
    },
    async jwt({ token, user }) {
      if (user) {
        await dbConnect();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.subscriptionTier = sanitizeStoredSubscriptionTier(dbUser.role, dbUser.subscriptionTier);
          token.favoritePlayers = dbUser.favoritePlayers || [];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).subscriptionTier = token.subscriptionTier || "free";
        (session.user as any).favoritePlayers = token.favoritePlayers || [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      try {
        await dbConnect();
        // Always fetch user from DB to get the latest role
        const dbUser = await User.findOne({ email: user.email });
        
        if (dbUser?.role === "admin") {
          await Event.create({
            player: "System",
            eventType: "admin_login",
            description: `Admin Logged In: ${dbUser.name}`,
            category: "admin",
            frameNumber: 0,
            points: 0
          });
        }
      } catch (error) {
        logError("auth.admin_sign_in_event_failed", error, { email: user.email });
      }
    },
    async signOut({ token }) {
      if (token?.role === "admin") {
        try {
          await dbConnect();
          await Event.create({
            player: "System",
            eventType: "admin_logout",
            description: `Admin Logged Out: ${token.name || token.email}`,
            category: "admin",
            frameNumber: 0,
            points: 0
          });
        } catch (error) {
          logError("auth.admin_sign_out_event_failed", error, { email: String(token.email ?? "") });
        }
      }
    }
  }
};
