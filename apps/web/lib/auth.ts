import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"; // <-- NEW
import bcrypt from "bcryptjs"; // <-- NEW
import dbConnect from "./mongodb";
import User from "./models/User";
import Event from "./models/Event";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // --- NEW: Email/Password Login Support ---
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("NextAuth: Starting authorize for", credentials?.email);
        await dbConnect();
        if (!credentials?.email || !credentials?.password) {
          console.log("NextAuth: Missing email or password");
          return null;
        }

        // Find user and explicitly select the hidden password field
        const user = await User.findOne({ email: credentials.email }).select("+password");
        console.log("NextAuth: Found user in DB?", !!user);
        
        if (!user || !user.password) {
          console.log("NextAuth: User not found or no password hash");
          return null;
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        console.log("NextAuth: Password valid?", isPasswordValid);
        
        if (!isPasswordValid) return null;

        console.log("NextAuth: Login successful for", user.email);
        // Return the user object for the session
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await dbConnect();
          const existingUser = await User.findOne({ email: user.email });
          if (!existingUser) {
            await User.create({ name: user.name, email: user.email, image: user.image, role: "user" });
          }
          return true;
        } catch (error) {
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
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
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
        console.error("Error logging admin sign-in:", error);
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
          console.error("Error logging admin sign-out:", error);
        }
      }
    }
  }
};