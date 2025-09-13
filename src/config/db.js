import prisma from "../utils/prisma.client.js";

// Connect to the database and log status
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL database successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1); // Exit process if DB connection fails
  }
}

export { prisma, connectDB };
