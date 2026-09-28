const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters long"],
            maxlength: [50, "Name cannot exceed 50 characters"]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters long"],
            select: false
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        canCreateTask: {
            type: Boolean,
            default: false
        },

        tokenVersion: {
            type: Number,
            default: 0,
        },

        resetPasswordOtpHash: {
            type: String,
            default: null,
            select: false
        },

        resetPasswordOtpExpiresAt: {
            type: Date,
            default: null,
            select: false
        },

resetPasswordOtpLastSentAt: {
    type: Date,
    default: null,
    select: false
},

resetPasswordOtpSendWindowStart: {
    type: Date,
    default: null,
    select: false
},

resetPasswordOtpSendCount: {
    type: Number,
    default: 0,
    select: false
},

resetPasswordOtpVerifyAttempts: {
    type: Number,
    default: 0,
    select: false
},

resetPasswordTokenVersion: {
    type: Number,
    default: 0,
    select: false
}
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;