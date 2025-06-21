const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const cors = require("cors");
const connectDB = require("./config/db");

require("dotenv").config({ path: "./.env" });
connectDB();
const authRoutes = require("./routes/auth-route");
const doctorRoutes = require("./routes/doctor-route");
const patientRoutes = require("./routes/patient-route");
const specialtyRoutes = require("./routes/special-route");
const governmentRoutes = require("./routes/governament-route");
const appointmentRoutes = require("./routes/appointment-route");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/specialties", specialtyRoutes);
app.use("/api/governments", governmentRoutes);
app.use("/api/appointments", appointmentRoutes);

const PORT = process.env.PORT || 6000;

const server = app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
);

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  server.close(() => process.exit(1));
});
