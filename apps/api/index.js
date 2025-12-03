require("dotenv").config();
const express = require("express");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");

const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const prisma = require("../../packages/db");

// Router utama (ONE ENTRY POINT)
const routes = require("./routes");

// Middleware auth
const authMiddleware = require("./middleware/userAuth");

// Swagger Doc
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ========================
   GLOBAL MIDDLEWARE
======================== */

// Body parser
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Cookie + security
app.use(cookieParser());
app.use(helmet());

// Rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

/* ========================
   ROOT
======================== */

app.get("/", (req, res) => {
  res.json({ status: "API Running" });
});

/* ========================
   API ROUTES
======================== */

// Semua route lewat sini (routes/index.js)
app.use("/api", apiLimiter, routes);

/* ========================
   STATIC FILES
======================== */

app.use("/uploads", express.static("uploads"));

/* ========================
   TEST & DEBUG
======================== */

app.post("/test-user", async (req, res) => {
  const bcrypt = require("bcrypt");
  const hashed = await bcrypt.hash("123456", 10);

  const user = await prisma.user.create({
    data: {
      name: "Debug User",
      email: "debug@mail.com",
      password: hashed,
    },
  });

  res.json(user);
});

/* ========================
   PROFILE (PROTECTED)
======================== */

app.get("/profile", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

/* ========================
   CLEAN SHUTDOWN
======================== */

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

/* ========================
   START SERVER
======================== */

app.listen(4000, () => {
  console.log("✅ API running at http://localhost:4000");
});
