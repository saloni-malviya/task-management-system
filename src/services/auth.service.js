const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("./email.service");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const env = require("../config/env");

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 min
const OTP_COOLDOWN_MS = 60 * 1000; // 1 min
const OTP_WINDOW_MS = 10 * 60 * 1000; // 10 min
const OTP_MAX_SENDS = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 5;

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }, // 15m
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      refreshTokenVersion: user.refreshTokenVersion,
      type: "refresh", // important — isse access token se differentiate karenge
    },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshExpiresIn }, // 7d
  );
};

/**
 * Reusable OTP sender
 * @param {ObjectId} userId
 * @param {"password-reset" | "email-verification"} purpose
 */
const sendOtp = async (userId, purpose) => {
  const user = await User.findById(userId).select(
    "+otpHash +otpPurpose +otpExpiresAt " +
      "+otpLastSentAt +otpSendWindowStart " +
      "+otpSendCount +otpVerifyAttempts",
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Purpose-specific checks
  if (purpose === "email-verification" && user.isEmailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  const now = new Date();

  // 1-min cooldown
  if (user.otpLastSentAt) {
    const secondsSinceLast = (now - user.otpLastSentAt) / 1000;

    if (secondsSinceLast < 60) {
      const remaining = Math.ceil(60 - secondsSinceLast);
      throw new AppError(
        `Please wait ${remaining} seconds before requesting another OTP`,
        429,
      );
    }
  }

  // 10-min / 5-send window
  let sendCount = user.otpSendCount || 0;
  let windowStart = user.otpSendWindowStart;

  // Agar purpose change hua hai (ya window expire), reset karo
  const purposeChanged = user.otpPurpose !== purpose;

  if (purposeChanged || !windowStart || now - windowStart >= OTP_WINDOW_MS) {
    windowStart = now;
    sendCount = 0;
  }

  if (sendCount >= OTP_MAX_SENDS) {
    const remainingMs = OTP_WINDOW_MS - (now - windowStart);
    const remainingMin = Math.ceil(remainingMs / 60000);

    throw new AppError(
      `Maximum OTP request limit reached. Please try again after ${remainingMin} minute(s)`,
      429,
    );
  }

  const otp = generateOtp();
  user.otpHash = hashOtp(otp);
  user.otpPurpose = purpose;
  user.otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
  user.otpLastSentAt = now;
  user.otpSendWindowStart = windowStart;
  user.otpSendCount = sendCount + 1;
  user.otpVerifyAttempts = 0;

  await user.save();

  // Send email based on purpose
  try {
    if (purpose === "password-reset") {
      await emailService.sendPasswordResetOtpEmail(user, otp);
    } else if (purpose === "email-verification") {
      await emailService.sendEmailVerificationOtpEmail(user, otp);
    }
  } catch (error) {
    // rollback OTP fields
    user.otpHash = null;
    user.otpPurpose = null;
    user.otpExpiresAt = null;
    user.otpLastSentAt = null;

    await user.save();

    console.error(`OTP email failed (${purpose}):`, error.message);

    throw new AppError(
      "Unable to send OTP email. Please try again later.",
      500,
    );
  }
  return {
    message: "OTP sent successfully",
  };
};

/**
 * Reusable OTP verifier
 * @param {string} email
 * @param {string} otp
 * @param {"password-reset" | "email-verification"} purpose
 * @returns verified user document (with OTP fields cleared)
 */
const verifyOtp = async (email, otp, purpose) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+otpHash +otpPurpose +otpExpiresAt +otpVerifyAttempts ",
  );

  if (!user) {
    throw new AppError("Invalid email or OTP", 400);
  }

  // Purpose mismatch check
  if (user.otpPurpose !== purpose) {
    throw new AppError(
      "No OTP found for this action. Please request a new OTP.",
      400,
    );
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new AppError("OTP not found. Please request a new OTP.", 400);
  }

  // Expiry check
  if (new Date() > user.otpExpiresAt) {
    user.otpHash = null;
    user.otpPurpose = null;
    user.otpExpiresAt = null;
    user.otpVerifyAttempts = 0;
    await user.save();

    throw new AppError("OTP has expired. Please request a new OTP.", 400);
  }

  // Attempts check
  if (user.otpVerifyAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
    user.otpHash = null;
    user.otpPurpose = null;
    user.otpExpiresAt = null;
    user.otpVerifyAttempts = 0;
    await user.save();

    throw new AppError(
      "Maximum OTP verification attempts exceeded. Please request a new OTP.",
      429,
    );
  }

  const hashedOtp = hashOtp(otp);

  if (hashedOtp !== user.otpHash) {
    user.otpVerifyAttempts += 1;
    await user.save();

    const remaining = OTP_MAX_VERIFY_ATTEMPTS - user.otpVerifyAttempts;

    throw new AppError(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt(s) remaining.`
        : "Maximum OTP verification attempts exceeded. Please request a new OTP.",
      400,
    );
  }

  // ✅ OTP correct — clear all OTP fields
  user.otpHash = null;
  user.otpPurpose = null;
  user.otpExpiresAt = null;
  user.otpLastSentAt = null;
  user.otpSendWindowStart = null;
  user.otpSendCount = 0;
  user.otpVerifyAttempts = 0;

  await user.save();

  return user;
};

const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isEmailVerified: false,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Email is already registered", 409);
    }

    throw error;
  }

  // Send verification OTP (non-blocking failure)
  try {
    await sendOtp(user._id, "email-verification");
  } catch (error) {
    console.error("Verification OTP sending failed:", error.message);
    // Don't throw — user can resend later
  }

  //response se password htana
  const userObject = user.toObject();
  delete userObject.password;

  return {
    ...userObject,
    message:
      "Registration successful. Please check your email for verification OTP.",
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email, isDeleted: false }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      "Please verify your email before logging in. Check your inbox for the OTP.",
      403,
    );
  }

  //token generate
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const userObject = user.toObject();

  delete userObject.password;

  return {
    user: userObject,
    accessToken,
    refreshToken,
  };
};

const logout = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.tokenVersion += 1;
  user.refreshTokenVersion += 1;

  await user.save();

  return {
    message: "Logout successful",
  };
};

const forgotPassword = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

  /* Do not reveal whether email exists.*/
  if (!user) {
    return {
      message: "If an account exists with this email, an OTP has been sent.",
    };
  }
  await sendOtp(user._id, "password-reset");

  return {
    message: "If an account exists with this email, an OTP has been sent.",
  };
};

const verifyResetOtp = async (email, otp) => {
  await verifyOtp(email, otp, "password-reset");

  // Fresh user fetch with resetPasswordTokenVersion
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select("+resetPasswordTokenVersion");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  //Generate short-lived reset token
  user.resetPasswordTokenVersion += 1;
  await user.save();

  const resetToken = jwt.sign(
    {
      userId: user._id.toString(),
      type: "password-reset",
      resetTokenVersion: user.resetPasswordTokenVersion,
    },
    env.jwtSecret,
    {
      expiresIn: "10m",
    },
  );

  return {
    resetToken,
    expiresIn: "10 minutes",
  };
};

const resetPassword = async (resetToken, newPassword) => {
  // verify jwt token
  let decoded;
  try {
    decoded = jwt.verify(resetToken, env.jwtSecret);
  } catch (error) {
    throw new AppError("Invalid or expired reset token", 401);
  }

  // type check (decode type = password reset)
  if (decoded.type !== "password-reset") {
    throw new AppError("Invalid reset token", 401);
  }

  //user find
  const user = await User.findById(decoded.userId).select(
    "+resetPasswordTokenVersion",
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  /*
   * Make sure this reset token is still valid (decoded.resettoken = user.resetPasstoken check kro)
   */
  if (decoded.resetTokenVersion !== user.resetPasswordTokenVersion) {
    throw new AppError("Reset token has already been used or invalidated", 401);
  }

  /*
   * Hash new password
   */
  user.password = await bcrypt.hash(newPassword, 10);

  //Invalidate this reset token
  user.resetPasswordTokenVersion += 1;

  /* If tokenVersion logout/session invalidation is already implemented in project,
   * invalidate existing login sessions too.
   */
  user.tokenVersion += 1;
  user.refreshTokenVersion += 1;

  await user.save();

  return {
    message:
      "Password reset successfully. Please login with your new password.",
  };
};

const verifyEmail = async (email, otp) => {
  const user = await verifyOtp(email, otp, "email-verification");

  // Mark email as verified
  user.isEmailVerified = true;
  await user.save();

  return {
    message: "Email verified successfully. You can now login.",
  };
};

const resendVerificationOtp = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

  if (!user) {
    return {
      message:
        "If an account exists with this email, a verification OTP has been sent.",
    };
  }

  if (user.isEmailVerified) {
    throw new AppError("Email is already verified. Please login.", 400);
  }

  await sendOtp(user._id, "email-verification");

  return {
    message: "Verification OTP sent to your email",
  };
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwtSecret);
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      throw new AppError("Invalid or expired refresh token", 401);
    }
    throw error;
  }
  

  // Check karo ye actually refresh token hai (access token nahi)
  if (decoded.type !== "refresh") {
    throw new AppError("Invalid refresh token", 401);
  }

  // User dhoondo
  const user = await User.findOne({ _id: decoded.userId, isDeleted: false });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  //  Kya refreshTokenVersion match kar raha hai?
  // Agar user ne logout kiya tha, to DB mein version badha hoga,
  // aur purane refresh token ka version purana hoga → mismatch → reject
  if (decoded.refreshTokenVersion !== user.refreshTokenVersion) {
    throw new AppError(
      "Refresh token has been invalidated. Please login again.",
      401,
    );
  }

  // Naya access token banao
  const newAccessToken = generateAccessToken(user);

  return {
    accessToken: newAccessToken,
  };
};

module.exports = {
  registerUser,
  loginUser,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  resendVerificationOtp,
  verifyEmail,
  refreshAccessToken,
};
