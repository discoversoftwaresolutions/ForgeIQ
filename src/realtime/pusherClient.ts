// src/realtime/pusherClient.ts
import Pusher from "pusher-js";

const env = (process.env as any);
const vite = (import.meta as any)?.env ?? {};

const key      = vite.VITE_PUSHER_KEY      ?? env.REACT_APP_PUSHER_KEY      ?? "local";
const cluster  = vite.VITE_PUSHER_CLUSTER  ?? env.REACT_APP_PUSHER_CLUSTER  ?? "mt1";
const host     = vite.VITE_PUSHER_HOST     ?? env.REACT_APP_PUSHER_HOST     ?? "localhost";
const portRaw  = vite.VITE_PUSHER_PORT     ?? env.REACT_APP_PUSHER_PORT     ?? "6001";
const tlsRaw   = vite.VITE_PUSHER_TLS      ?? env.REACT_APP_PUSHER_TLS      ?? "false";
const authURL  = vite.VITE_PUSHER_AUTH_ENDPOINT ?? env.REACT_APP_PUSHER_AUTH_ENDPOINT;

const forceTLS = tlsRaw === "true";
const port = Number(portRaw);

export const pusher = new Pusher(key, {
  cluster,                   // keep to satisfy library checks
  wsHost: host,
  wsPort: forceTLS ? undefined : port,
  wssPort: forceTLS ? port : undefined,
  forceTLS,
  enabledTransports: forceTLS ? ["ws", "wss"] : ["ws"],
  disableStats: true,
  authEndpoint: authURL,     // needed for private/presence channels
  auth: {
    headers: {
      // pass your session/JWT if needed
      // Authorization: `Bearer ${token}`,
    },
  },
});

export default pusher;
