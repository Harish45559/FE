import { io } from "socket.io-client";

const url = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api$/, "");

const socket = io(url, {
  transports: ["polling", "websocket"],
  upgrade: true,
});

export default socket;
