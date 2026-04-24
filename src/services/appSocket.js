import { io } from "socket.io-client";

const url = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api$/, "");

const socket = io(url, {
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export default socket;
