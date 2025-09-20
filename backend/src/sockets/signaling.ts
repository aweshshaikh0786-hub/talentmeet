import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

export default function signaling(io: Server) {
  io.use((socket: Socket, next) => {
    // optional: token in handshake auth: socket.handshake.auth.token
    const token = (socket.handshake.auth && socket.handshake.auth.token) || null;
    if (token) {
      try {
        const payload = jwt.verify(token as string, process.env.ACCESS_TOKEN_SECRET as string);
        (socket as any).user = payload;
        return next();
      } catch (e) {
        return next(new Error("Authentication error"));
      }
    }
    // allow anonymous if you prefer
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log("socket connected", socket.id);

    socket.on("join-room", ({ roomId }) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", { socketId: socket.id });
    });

    socket.on("signal", ({ to, data }) => {
      io.to(to).emit("signal", { from: socket.id, data });
    });

    socket.on("disconnect", () => {
      console.log("socket disconnected", socket.id);
    });
  });
}
