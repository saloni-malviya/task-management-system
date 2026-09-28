const express = require("express");

const {
    registerValidator,
    loginValidator, forgotPasswordValidator, verifyResetOtpValidator, resetPasswordValidator
} = require("../validators/auth.validator");

const validate = require("../middleware/validation.middleware");

const {
    register,
    login, logout, forgotPassword, verifyResetOtp, resetPassword
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


module.exports = router;