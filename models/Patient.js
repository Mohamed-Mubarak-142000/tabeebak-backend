const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const PatientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"],
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minlength: 6,
    select: false,
  },
  otp: String,
  otpExpiry: Date,
  phone: {
    type: String,
    required: [true, "Please add a phone number"],
  },
  age: {
    type: Number,
    required: [true, "Please add an age"],
  },
  gender: {
    type: String,
    enum: ["male", "female"],
  },

  photo: {
    type: String,
    default: "default.jpg",
    validate: {
      validator: function (v) {
        return /\.(jpg|jpeg|png|gif)$/i.test(v) || /^https?:\/\/.+/i.test(v);
      },
      message: (props) => `${props.value} is not a valid image URL or path!`,
    },
  },

  photoPublicId: {
    type: String,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password before saving
PatientSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Encrypt password using bcrypt
PatientSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Patient", PatientSchema);
