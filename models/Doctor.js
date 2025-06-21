const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { governorates } = require("../controllers/government-controller");
const { specialties } = require("../controllers/special-controller");

const DoctorSchema = new mongoose.Schema({
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
  specialty: {
    type: String,
    required: [true, "Please add a specialty"],
    enum: specialties.map((spec) => spec.value),
  },

  location: {
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    required: false,
  },

  governorate: {
    type: String,
    required: [true, "Please add a governorate"],
    enum: governorates.map((gov) => gov.value),
  },
  address: {
    type: String,
    required: [true, "Please add an address"],
  },
  phone: {
    type: String,
    required: [true, "Please add a phone number"],
  },
  otp: String,
  otpExpiry: Date,
  age: {
    type: Number,
    required: [true, "Please add an age"],
  },
  bio: {
    type: String,
    required: [true, "Please add a bio"],
  },
  experience: {
    type: Number,
    required: [true, "Please add years of experience"],
  },
  available: {
    type: Boolean,
    default: true,
  },

  availableSlots: [
    {
      day: {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        required: true,
      },
      startTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      endTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      slotDuration: {
        type: Number,
        default: 30,
      },
      isAvailable: {
        type: Boolean,
        default: true,
      },
      type: {
        type: String,
        enum: ["consultation", "procedure", "test", "medication"],
        default: "consultation",
      },
    },
  ],

  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
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
DoctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Encrypt password using bcrypt
DoctorSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// models/Doctor.js
DoctorSchema.pre("save", function (next) {
  if (this.reviews && this.reviews.length > 0) {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = parseFloat((sum / this.reviews.length).toFixed(1));
  } else {
    this.averageRating = 0;
  }
  next();
});

module.exports = mongoose.model("Doctor", DoctorSchema);
