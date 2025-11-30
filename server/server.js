const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { cleanEnv, port, url, str } = require("envalid");
require("dotenv").config();

// --- 1. ENV VARIABLE SECURITY ---
const env = cleanEnv(process.env, {
  PORT: port({ default: 5000 }),
  MONGODB_URI: url(),
  JWT_SECRET: str(),
});

const app = express();

// --- 2. SECURITY HEADERS ---
app.use(helmet());

// --- 3. CORS CONFIGURATION ---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chromerebellion.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// --- 4. RATE LIMITING ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

app.use("/api", apiLimiter);

// --- 5. BODY PARSING ---
app.use(express.json({ limit: "1mb" }));

// --- 6. ROUTES ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/slots", require("./routes/slots"));

// --- 7. DATABASE ---
mongoose
  .connect(env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date() });
});

// --- 8. GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
