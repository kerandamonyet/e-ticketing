require("dotenv").config();
const express = require("express");
const app = express();
const authRoutes = require("./routes/auth");
const eoRoutes = require("./routes/eo");
const adminRoutes = require("./routes/admin");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const prisma = require("../../packages/db");

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(helmet());

// RATE LIMITER instances
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/", (req, res) => {
  res.json({ status: "API Running" });
});

// mount with limiter BEFORE route handlers
app.use("/api/auth", generalLimiter, authRoutes);
app.use("/api/eo", generalLimiter, eoRoutes);
app.use("/api/admin", generalLimiter, adminRoutes);

app.use("/uploads", express.static("uploads"));

// other route-specific rate limiters can be used too
app.use(
  "/api/eo/apply",
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
  })
);

// health / test routes...
app.post("/test-user", async (req, res) => {
  try {
    const user = await prisma.user.create({
      data: {
        name: "Debug User",
        email: "debug@mail.com",
        password: "123456",
      },
    });
    res.json(user);
  } catch (error) {
    console.error("ERROR CREATE USER:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

const authMiddleware = require("./middleware/auth");
app.get("/profile", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(4000, () => {
  console.log("✅ API on http://localhost:4000");
});
