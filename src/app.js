import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

//Routes Imports
import userRoutes from "./routes/user.routes.js";
import pollRoutes from "./routes/poll.routes.js";

app.get("/", (req, res) => {
  res.status(200).send("APIs are working...");
});

// Routes Definitions
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/polls", pollRoutes);

export { app };
