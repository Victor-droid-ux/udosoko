"use strict";
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND = path.join(__dirname, "../../frontend");

// ── Connect DB ────────────────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS || "http://localhost:5000").split(","),
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(FRONTEND));
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// ── Serve frontend pages ──────────────────────────────────────────────────────
const pages = {
  "/": "index.html",
  "/login": "login.html",
  "/register": "register.html",
  "/dashboard": "dashboard.html",
  "/apply": "apply.html",
  "/payment": "payment.html",
  "/status": "status.html",
  "/admin": "admin.html",
  "/admin/login": "admin-login.html",
  "/verify-email": "verify-email.html",
  "/reset-password": "reset-password.html",
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(FRONTEND, file), (err) => {
      if (err) res.sendFile(path.join(FRONTEND, "index.html"));
    });
  });
});

// Serve .php.html files as their clean URL
app.get("/{*path}", (req, res) => {
  const fs = require("fs");
  const file = path.join(FRONTEND, req.path);
  if (fs.existsSync(file + ".html")) return res.sendFile(file + ".html");
  if (fs.existsSync(file + ".php.html"))
    return res.sendFile(file + ".php.html");
  if (fs.existsSync(file) && fs.statSync(file).isFile())
    return res.sendFile(file);
  res.sendFile(path.join(FRONTEND, "index.html"));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "An error occurred."
        : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`📁  Frontend → ${FRONTEND}`);
});
