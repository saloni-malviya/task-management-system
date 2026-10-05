const express = require("express");

const {
    registerValidator,
    loginValidator, forgotPasswordValidator, verifyResetOtpValidator, resetPasswordValidator, resendVerificationOtpValidator, verifyEmailValidator, refreshTokenValidator                               
} = require("../validators/auth.validator");

const validate = require("../middleware/validation.middleware");

const { authLimiter, otpLimiter } = require("../middleware/rateLimit.middleware");

const {
    register,
    login, logout, forgotPassword, verifyResetOtp, resetPassword, resendVerificationOtp, verifyEmail, refresh      
} = require("../controllers/auth.controller");

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const router = express.Router();

router.post(
    "/register",
    authLimiter,
    registerValidator,
    validate,
    register
);

router.post(
    "/login",
    authLimiter,
    loginValidator,
    validate,
    login
);

router.post("/logout", protect, logout);

router.post(
    "/forgot-password",
    otpLimiter,
    forgotPasswordValidator,
    validate,
    forgotPassword
);

router.post(
    "/verify-forgot-password-otp",
    otpLimiter,
    verifyResetOtpValidator,
    validate,
    verifyResetOtp
);

router.post(
    "/reset-password",
    authLimiter,
    resetPasswordValidator,
    validate,
    resetPassword
);

router.post(
    "/resend-verification-otp",
    otpLimiter,
    resendVerificationOtpValidator,
    validate,
    resendVerificationOtp
);

router.post(
    "/verify-email",
    otpLimiter,
    verifyEmailValidator,
    validate,
    verifyEmail
);

router.post(
    "/refresh",
    refreshTokenValidator,
    validate,
    refresh
);

module.exports = router;