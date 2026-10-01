const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    canCreateTask: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    refreshTokenVersion: {
      type: Number,
      default: 0
},
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },

        deletedAt: {
            type: Date,
            default: null
        },

        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    otpPurpose: {
      type: String,
      enum: ["password-reset", "email-verification"],
      default: null,
      select: false,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    otpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    otpSendWindowStart: {
      type: Date,
      default: null,
      select: false,
    },

    otpSendCount: {
      type: Number,
      default: 0,
      select: false,
    },

    otpVerifyAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // ===== EMAIL VERIFICATION FLAG =====
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    resetPasswordTokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
