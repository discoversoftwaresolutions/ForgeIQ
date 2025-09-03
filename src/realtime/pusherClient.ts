// src/realtime/pusherClient.ts
import Pusher, { Channel, PresenceChannel } from "pusher-js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Pusher/Soketi client for ForgeIQ — Railway hard-coded endpoints
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Works with Soketi (Pusher-compatible) hosted on Railway
 *  • Requires a PUBLIC key (keep it in Vite env); all URLs are hard-coded
 *  • Supports public, private, and presence channels
 *  • Adds sensible timeouts & a tiny helper API
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** ==== Configure these two if needed ==== */
const PUSHER_KEY =
  import.meta.env.VITE_PUSHER_KEY /* real public key */ ?? "local";

/** Soketi host on Railway (WebSocket endpoint) */
const WS_HOST = "soketi-forgeiq-production.up.railway.app";

/** Auth endpoint on your FastAPI backend (for private/presence) */
const AUTH_ENDPOINT =
  "https://forgeiq-production.up.railway.app/api/broadcasting/auth";

/** Pull bearer token (if you use JWT auth) */
function getAuthToken(): string | null {
  // Adjust to your auth storage strategy
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("jwt") ||
    null
  );
}

/** Create singleton Pusher client */
export const pusher = new Pusher(PUSHER_KEY, {
  // Pusher still demands a cluster value even for Soketi; mt1 is a safe dummy.
  cluster: "mt1",

  // ── Soketi host details (Railway) ──────────────────────────────────────────
  wsHost: WS_HOST,
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ["ws", "wss"],

  // ── Performance/telemetry ─────────────────────────────────────────────────
  disableStats: true,

  // ── Heartbeats & timeouts (tune as you like) ──────────────────────────────
  activityTimeout: 12000, // ms of inactivity before sending ping
  pongTimeout: 6000,      // ms to await pong

  // ── Private/Presence auth ─────────────────────────────────────────────────
  authEndpoint: AUTH_ENDPOINT,
  auth: {
    transport: "ajax",
    withCredentials: false, // CORS via headers instead of cookies
    headers: () => {
      const headers: Record<string, string> = {
        "X-Requested-With": "XMLHttpRequest",
      };
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return headers;
    },
  },
});

/** Optional: log connection changes (disable in production if too chatty) */
pusher.connection.bind("state_change", (states: any) => {
  // eslint-disable-next-line no-console
  console.log("[Pusher] state:", states.previous, "→", states.current);
});

pusher.connection.bind("error", (err: any) => {
  // eslint-disable-next-line no-console
  console.error("[Pusher] error:", err);
});

/** Reconnect on tab focus if needed */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    const state = (pusher.connection as any)?.state;
    if (state !== "connected" && state !== "connecting") {
      // eslint-disable-next-line no-console
      console.log("[Pusher] reconnecting on visibilitychange…");
      try {
        (pusher as any).connect();
      } catch (_) {
        /* ignore */
      }
    }
  }
});

/* ───────────────────────────── Helpers API ──────────────────────────────── */

export type BindableChannel = Channel | PresenceChannel;

/** Subscribe to a public channel: e.g., "forgeiq.public" */
export function joinPublic(channelName: string): Channel {
  return pusher.subscribe(channelName);
}

/** Subscribe to a private channel: e.g., "private-forgeiq" */
export function joinPrivate(channelName: string): Channel {
  if (!channelName.startsWith("private-")) {
    channelName = `private-${channelName}`;
  }
  return pusher.subscribe(channelName);
}

/** Subscribe to a presence channel: e.g., "presence-forgeiq" */
export function joinPresence(channelName: string): PresenceChannel {
  if (!channelName.startsWith("presence-")) {
    channelName = `presence-${channelName}`;
  }
  return pusher.subscribe(channelName) as PresenceChannel;
}

/** Bind an event with automatic unbind disposer */
export function on<T = any>(
  channel: BindableChannel,
  event: string,
  handler: (data: T) => void
): () => void {
  channel.bind(event, handler);
  return () => channel.unbind(event, handler);
}

/** Leave a channel cleanly */
export function leave(channelName: string): void {
  pusher.unsubscribe(channelName);
}

/** Full teardown (rarely needed; good for route unmounts in SPAs) */
export function teardown(): void {
  try {
    pusher.allChannels().forEach((c) => pusher.unsubscribe(c.name));
    pusher.disconnect();
  } catch {
    /* ignore */
  }
}

export default pusher;
