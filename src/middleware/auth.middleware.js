const jwt = require("jsonwebtoken");

const User = require("../models/User");
const AppError = require("../utils/AppError");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError(
            "Authentication token is required",
            401
        );
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
        decoded = jwt.verify(token, env.jwtSecret);
    } catch (error) {
        throw new AppError(
            "Invalid or expired token",
            401
        );
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
        throw new AppError(
            "User associated with this token no longer exists",
            401
        );
    }

    req.user = {
        userId: user._id.toString(),
        role: user.role
    };

    next();
});

module.exports = protect;