const express = require("express");

const {
    registerValidator,
    loginValidator, forgotPasswordValidator, verifyResetOtpValidator, resetPasswordValidator, resendVerificationOtpValidator, verifyEmailValidator, refreshTokenValidator                               
} = require("../validators/auth.validator");

const validate = require("../middleware/validation.middleware");

const {
    register,
    login, logout, forgotPassword, verifyResetOtp, resetPassword, resendVerificationOtp, verifyEmail, refresh      
} = require("../controllers/auth.controller");

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const router = express.Router();

router.post(
    "/register",
    registerValidator,
    validate,
    register
);

router.post(
    "/login",
    loginValidator,
    validate,
    login
);

router.post("/logout", protect, logout);

router.post(
    "/forgot-password",
    forgotPasswordValidator,
    validate,
    forgotPassword
);

router.post(
    "/verify-forgot-password-otp",
    verifyResetOtpValidator,
    validate,
    verifyResetOtp
);

router.post(
    "/reset-password",
    resetPasswordValidator,
    validate,
    resetPassword
);

router.post(
    "/resend-verification-otp",
    resendVerificationOtpValidator,
    validate,
    resendVerificationOtp
);

router.post(
    "/verify-email",
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