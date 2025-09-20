import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import app from "./app";
import signaling from "./sockets/signaling";

dotenv.config();

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(async () => {
    console.log("✅ Database connected");

    const server = createServer(app);

    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:4200",
        credentials: true,
      },
    });

    signaling(io);

    server.listen(PORT, () => console.log(`🚀 Server started on ${PORT}`));
  })
  .catch((err) => {
    console.error("DB init error:", err);
  });
