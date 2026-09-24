const express = require("express");

const {
    registerValidator,
    loginValidator
} = require("../validators/auth.validator");

const validate = require("../middleware/validation.middleware");

const {
    register,
    login, logout
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


module.exports = router;