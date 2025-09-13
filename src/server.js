import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import initializeSocketIO from "./socket/index.js";

dotenv.config();
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    // 1️⃣ Connect to DB
    await connectDB();

    // 2️⃣ Create ONE httpServer for both Express and Socket.IO
    const httpServer = createServer(app);

    // 3️⃣ Attach Socket.IO to this server
    const io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // 4️⃣ Pass io to your app/routes if needed
    app.set("io", io);
    app.use((req, res, next) => {
      req.io = app.get("io"); // ⬅ attach io instance
      next();
    });

    // 5️⃣ Initialize socket handlers
    initializeSocketIO(io);

    // 6️⃣ Start httpServer (NOT app.listen)
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
