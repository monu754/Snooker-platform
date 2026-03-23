import PusherServer from "pusher";
import PusherClient from "pusher-js";
import { logWarn } from "./logger";

function hasPusherConfig() {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.PUSHER_SECRET &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );
}

function createNoopServer() {
  return {
    async trigger() {
      logWarn("pusher.server_not_configured");
    },
  };
}

// Server-side: Used in API routes to trigger events
export const pusherServer = hasPusherConfig()
  ? new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    })
  : createNoopServer();

// Client-side: Used in React components to listen for events
export const getPusherClient = () => {
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    logWarn("pusher.client_not_configured");
    return {
      subscribe() {
        return { bind() {} };
      },
      unsubscribe() {},
    };
  }

  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });
};
