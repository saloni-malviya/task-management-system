const { body, validationResult } = require("express-validator");

// Helper to reject unknown fields
const rejectUnknownFields = (allowedFields) => {
    return (req, res, next) => {
        const receivedFields = Object.keys(req.body);
        const unknownFields = receivedFields.filter(
            (field) => !allowedFields.includes(field)
        );

        if (unknownFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Unknown fields: ${unknownFields.join(", ")}. Allowed fields: ${allowedFields.join(", ")}`
            });
        }

        next();
    };
};


const registerValidator = [
    rejectUnknownFields(["name", "email", "password", "confirmPassword"]),
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ min: 2, max: 50 })
        .withMessage("Name must be between 2 and 50 characters"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),

    body("confirmPassword")
        .notEmpty()
        .withMessage("Confirm password is required")
        .bail()
        .custom((value, { req }) => {
        if (value !== req.body.password) {
        throw new Error("Passwords do not match");
        }

      return true;
    }),
];

const loginValidator = [
    rejectUnknownFields(["email", "password"]),
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
];

const forgotPasswordValidator = [
    rejectUnknownFields(["email"]),
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail()
];

const verifyResetOtpValidator = [
    rejectUnknownFields(["email", "otp"]),
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),

    body("otp")
        .trim()
        .notEmpty()
        .withMessage("OTP is required")
        .bail()
        .matches(/^\d{6}$/)
        .withMessage("OTP must be a 6-digit number")
];

const resetPasswordValidator = [
    rejectUnknownFields(["resetToken", "newPassword", "confirmPassword"]),
    body("resetToken")
        .trim()
        .notEmpty()
        .withMessage("Reset token is required"),

    body("newPassword")
        .notEmpty()
        .withMessage("New password is required")
        .bail()
        .isLength({ min: 6 })
        .withMessage(
            "New password must be at least 6 characters"
        ),

    body("confirmPassword")
        .notEmpty()
        .withMessage(
            "Confirm password is required"
        )
        .bail()
        .custom((value, { req }) => {
            if (
                value !== req.body.newPassword
            ) {
                throw new Error(
                    "Passwords do not match"
                );
            }

            return true;
        })
];

module.exports = {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    verifyResetOtpValidator,
    resetPasswordValidator
};
