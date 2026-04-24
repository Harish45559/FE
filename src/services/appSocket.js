import { io } from "socket.io-client";

const url = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api$/, "");

console.log("[socket] connecting to:", url);

const socket = io(url, {
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on("connect", () => console.log("[socket] connected ✓ id:", socket.id));
socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));
socket.on("connect_error", (err) => console.log("[socket] connect_error:", err.message));

export default socket;
