const { body } = require("express-validator");

const updateProfileValidator = [
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ min: 2, max: 50 })
        .withMessage("Name must be between 2 and 50 characters"),

    body("currentPassword")
        .if(body("newPassword").exists())
        .notEmpty()
        .withMessage("Current password is required"),

    body("newPassword")
        .optional()
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters long")
];

const updateUserByAdminValidator = [
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ min: 2, max: 50 })
        .withMessage("Name must be between 2 and 50 characters"),

    body("role")
        .optional()
        .isIn(["user", "admin"])
        .withMessage("Role must be user or admin")
];

module.exports = {
    updateProfileValidator, updateUserByAdminValidator
};