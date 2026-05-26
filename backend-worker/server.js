import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import playwright from "playwright";
import generateRouter from "./routes/generate.js";
import exportRouter from "./routes/export.js";
import carouselRouter from "./routes/carousels.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors({ origin: "*" })); // Allows connection from any frontend origin
app.use(express.json());

// Global variables to hold database connection and warm browser instance
let browserInstance = null;

// Connect to MongoDB
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.warn("⚠️ MONGODB_URI is not defined in .env. Skipping DB connection.");
    return;
  }
  try {
    await mongoose.connect(mongoURI);
    console.log("🔋 MongoDB Connected Successfully.");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Launch a shared headless Playwright browser on startup (Gotcha B Optimization)
// This warm instance will be shared by all export requests to prevent memory spikes
const launchBrowser = async () => {
  try {
    console.log("🌐 Initializing shared headless Chromium browser instance...");
    browserInstance = await playwright.chromium.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Great for low-memory container instances like Render/Railway
        "--disable-accelerated-2d-canvas",
        "--disable-gpu"
      ]
    });
    
    // Store in Express app locals so routes can easily access it
    app.locals.browser = browserInstance;
    console.log("🚀 Shared Playwright Browser is warm and ready.");
  } catch (err) {
    console.error("❌ Failed to launch Playwright browser:", err.message);
  }
};

// Register routes
app.use("/api/generate", generateRouter);
app.use("/api/export", exportRouter);
app.use("/api/carousels", carouselRouter);

// Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    browser: browserInstance ? "warm" : "offline",
    time: new Date()
  });
});

// Graceful Shutdown: close browser and DB connections cleanly
const gracefulShutdown = async () => {
  console.log("🧹 Gracefully shutting down worker...");
  if (browserInstance) {
    await browserInstance.close();
    console.log("🔒 Headless browser closed.");
  }
  await mongoose.disconnect();
  console.log("🔌 Database disconnected.");
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Initialize Services & Start Server
const startServer = async () => {
  await connectDB();
  await launchBrowser();
  
  app.listen(PORT, () => {
    console.log(`📡 Carousel Studio Worker listening on http://localhost:${PORT}`);
  });
};

startServer();
