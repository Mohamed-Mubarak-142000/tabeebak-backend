require("dotenv").config({ path: "./.env" });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const colors = require("colors");
const connectDB = require("./config/db");

// Connect to DB
connectDB();

const app = express();

// Allowed Origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://tabeebak-frontend.vercel.app",
];

// CORS Options
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 200,
};

// Express Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Middleware
app.use(cors(corsOptions));

// Manual Headers (Extra Safety)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Expose-Headers", "Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Logger (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes
const authRoutes = require("./routes/auth-route");
const doctorRoutes = require("./routes/doctor-route");
const patientRoutes = require("./routes/patient-route");
const specialtyRoutes = require("./routes/special-route");
const governmentRoutes = require("./routes/governament-route");
const appointmentRoutes = require("./routes/appointment-route");

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/specialties", specialtyRoutes);
app.use("/api/governments", governmentRoutes);
app.use("/api/appointments", appointmentRoutes);

// Health check
app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "OK", message: "Tabeebak Backend API Running" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack.red);
  res.status(500).json({ error: "Internal Server Error" });
});

// Server Listener
const PORT = process.env.PORT || 6000;
const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});

// Handle Unhandled Rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  server.close(() => process.exit(1));
});

module.exports = app;
