const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const cors = require("cors");
const connectDB = require("./config/db");

// Load env vars
require("dotenv").config({ path: "./.env" });

// Connect to database
connectDB();

// Route files
const authRoutes = require("./routes/auth-route");
const doctorRoutes = require("./routes/doctor-route");
const patientRoutes = require("./routes/patient-route");
const specialtyRoutes = require("./routes/special-route");
const governmentRoutes = require("./routes/governament-route");
const appointmentRoutes = require("./routes/appointment-route");

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Middleware
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://tabeebak-frontend.vercel.app"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// CORS Options
const corsOptions = {
  origin: ["http://localhost:5173", "https://tabeebak-frontend.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization"],
};

app.use(cors(corsOptions));

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/specialties", specialtyRoutes);
app.use("/api/governments", governmentRoutes);
app.use("/api/appointments", appointmentRoutes);

const PORT = process.env.PORT || 6000;

app.get("/", (req, res) => {
  res.send("Welcome to Tabeebak Backend API");
});

const server = app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  server.close(() => process.exit(1));
});

module.exports = app;
