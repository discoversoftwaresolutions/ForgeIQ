new Pusher(import.meta.env.VITE_PUSHER_KEY, {
  wsHost: "soketi-forgeiq-production.up.railway.app", // Railway domain
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ["ws", "wss"],
  disableStats: true,
});
