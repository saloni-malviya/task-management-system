const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("./email.service");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const env = require("../config/env");


const hashOtp = (otp) => {
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
};
const generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};


const registerUser = async ({ name, email, password }) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new AppError("Email is already registered", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "user"
        });

        const userObject = user.toObject();

        delete userObject.password;

        return userObject;
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError("Email is already registered", 409);
        }

        throw error;
    }
};

const loginUser = async ({ email, password }) => {
    const user = await User
        .findOne({ email })
        .select("+password");

    if (!user) {
        throw new AppError("Invalid email or password", 401);
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new AppError("Invalid email or password", 401);
    }

    const token = jwt.sign(
        {
            userId: user._id,
            role: user.role,
            tokenVersion: user.tokenVersion,
        },
        env.jwtSecret,
        {
            expiresIn: env.jwtExpiresIn
        }
    );

    const userObject = user.toObject();

    delete userObject.password;

    return {
        user: userObject,
        token
    };
};

const logout = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    user.tokenVersion += 1;

    await user.save();

    return {
        message: "Logout successful",
    };
};

const forgotPassword = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
        email: normalizedEmail
    }).select(
        "+resetPasswordOtpHash " +
        "+resetPasswordOtpExpiresAt " +
        "+resetPasswordOtpLastSentAt " +
        "+resetPasswordOtpSendWindowStart " +
        "+resetPasswordOtpSendCount " +
        "+resetPasswordOtpVerifyAttempts"
    );

    /*
     * Do not reveal whether email exists.
     */
    if (!user) {
        return {
            message:
                "If an account exists with this email, an OTP has been sent."
        };
    }

    const now = new Date();

    /*
     * 1-minute cooldown
     */
    if (user.resetPasswordOtpLastSentAt) {
        const secondsSinceLastOtp =
            (now - user.resetPasswordOtpLastSentAt) / 1000;

        if (secondsSinceLastOtp < 60) {
            const remainingSeconds = Math.ceil(
                60 - secondsSinceLastOtp
            );

            throw new AppError(
                `Please wait ${remainingSeconds} seconds before requesting another OTP`,
                429
            );
        }
    }

    /*
     * 10-minute / 5-OTP limit
     */
    let sendCount = user.resetPasswordOtpSendCount || 0;
    let windowStart = user.resetPasswordOtpSendWindowStart;

    if (
        !windowStart ||
        now - windowStart >= 10 * 60 * 1000
    ) {
        windowStart = now;
        sendCount = 0;
    }

    if (sendCount >= 5) {
        const remainingTime =
            10 * 60 * 1000 -
            (now - windowStart);

        const remainingMinutes = Math.ceil(
            remainingTime / 60000
        );

        throw new AppError(
            `Maximum OTP request limit reached. Please try again after ${remainingMinutes} minute(s)`,
            429
        );
    }

    /*
     * Generate OTP
     */
    const otp = generateOtp();

    /*
     * Store only hash in DB
     */
    user.resetPasswordOtpHash = hashOtp(otp);

    /*
     * OTP valid for 10 minutes
     */
    user.resetPasswordOtpExpiresAt =
        new Date(now.getTime() + 10 * 60 * 1000);

    /*
     * Track sending
     */
    user.resetPasswordOtpLastSentAt = now;
    user.resetPasswordOtpSendWindowStart = windowStart;
    user.resetPasswordOtpSendCount = sendCount + 1;

    /*
     * New OTP gets fresh verification attempts
     */
    user.resetPasswordOtpVerifyAttempts = 0;

    await user.save();

    try {
        await emailService.sendPasswordResetOtpEmail(
            user,
            otp
        );
    } catch (error) {
        /*
         * If email sending fails, rollback OTP data.
         */
        user.resetPasswordOtpHash = null;
        user.resetPasswordOtpExpiresAt = null;
        user.resetPasswordOtpLastSentAt = null;

        await user.save();

        console.error(
            "Password reset OTP email failed:",
            error.message
        );

        throw new AppError(
            "Unable to send OTP email. Please try again later.",
            500
        );
    }

    return {
        message:
            "If an account exists with this email, an OTP has been sent."
    };
};


const verifyResetOtp = async (email, otp) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
        email: normalizedEmail
    }).select(
        "+resetPasswordOtpHash " +
        "+resetPasswordOtpExpiresAt " +
        "+resetPasswordOtpVerifyAttempts " +
        "+resetPasswordTokenVersion"
    );

    if (!user) {
        throw new AppError(
            "Invalid email or OTP",
            400
        );
    }

    /*
     * No OTP exists
     */
    if (
        !user.resetPasswordOtpHash ||
        !user.resetPasswordOtpExpiresAt
    ) {
        throw new AppError(
            "OTP not found. Please request a new OTP.",
            400
        );
    }

    /*
     * OTP expired
     */
    if (
        new Date() >
        user.resetPasswordOtpExpiresAt
    ) {
        user.resetPasswordOtpHash = null;
        user.resetPasswordOtpExpiresAt = null;
        user.resetPasswordOtpVerifyAttempts = 0;

        await user.save();

        throw new AppError(
            "OTP has expired. Please request a new OTP.",
            400
        );
    }

    /*
     * Maximum verification attempts
     */
    if (
        user.resetPasswordOtpVerifyAttempts >= 5
    ) {
        user.resetPasswordOtpHash = null;
        user.resetPasswordOtpExpiresAt = null;
        user.resetPasswordOtpVerifyAttempts = 0;

        await user.save();

        throw new AppError(
            "Maximum OTP verification attempts exceeded. Please request a new OTP.",
            429
        );
    }

    const hashedOtp = hashOtp(otp);

    /*
     * Wrong OTP
     */
    if (
        hashedOtp !== user.resetPasswordOtpHash
    ) {
        user.resetPasswordOtpVerifyAttempts += 1;

        await user.save();

        const remainingAttempts =
            5 - user.resetPasswordOtpVerifyAttempts;

        throw new AppError(
            remainingAttempts > 0
                ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
                : "Maximum OTP verification attempts exceeded. Please request a new OTP.",
            400
        );
    }

    /*
     * OTP correct
     */

    /*
     * Invalidate OTP immediately
     */
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    user.resetPasswordOtpVerifyAttempts = 0;

    /*
     * Generate new reset token version
     */
    user.resetPasswordTokenVersion += 1;

    await user.save();

    /*
     * Generate short-lived reset token
     */
    const resetToken = jwt.sign(
        {
            userId: user._id.toString(),
            type: "password-reset",
            resetTokenVersion:
                user.resetPasswordTokenVersion
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "10m"
        }
    );

    return {
        resetToken,
        expiresIn: "10 minutes"
    };
};

const resetPassword = async (
    resetToken,
    newPassword
) => {
    let decoded;

    try {
        decoded = jwt.verify(
            resetToken,
            process.env.JWT_SECRET
        );
    } catch (error) {
        throw new AppError(
            "Invalid or expired reset token",
            401
        );
    }

    if (
        decoded.type !== "password-reset"
    ) {
        throw new AppError(
            "Invalid reset token",
            401
        );
    }

    const user = await User.findById(
        decoded.userId
    ).select(
        "+resetPasswordTokenVersion"
    );

    if (!user) {
        throw new AppError(
            "User not found",
            404
        );
    }

    /*
     * Make sure this reset token is still valid
     */
    if (
        decoded.resetTokenVersion !==
        user.resetPasswordTokenVersion
    ) {
        throw new AppError(
            "Reset token has already been used or invalidated",
            401
        );
    }

    /*
     * Hash new password
     */
    user.password = await bcrypt.hash(
        newPassword,
        10
    );

    /*
     * Invalidate this reset token
     */
    user.resetPasswordTokenVersion += 1;

    /*
     * Clear all OTP-related data
     */
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    user.resetPasswordOtpLastSentAt = null;
    user.resetPasswordOtpSendWindowStart = null;
    user.resetPasswordOtpSendCount = 0;
    user.resetPasswordOtpVerifyAttempts = 0;

    /*
     * If tokenVersion logout/session invalidation
     * is already implemented in your project,
     * invalidate existing login sessions too.
     */
    if (
        typeof user.tokenVersion === "number"
    ) {
        user.tokenVersion += 1;
    }

    await user.save();

    return {
        message:
            "Password reset successfully. Please login with your new password."
    };
};


module.exports = {
    registerUser,
    loginUser, logout, forgotPassword, verifyResetOtp, resetPassword
};