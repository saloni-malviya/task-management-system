const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const register = asyncHandler(async (req, res) => {
    const user = await authService.registerUser(req.body);

    return sendResponse(
        res,
        201,
        "User registered successfully",
        user
    );
});

const login = asyncHandler(async (req, res) => {
    const result = await authService.loginUser(req.body);

    return sendResponse(
        res,
        200,
        "Login successful",
        result
    );
});

const logout = asyncHandler(async (req, res) => {
    const result = await authService.logout(req.user.userId);

    return res.status(200).json({
        success: true,
        message: result.message,
    });
});

module.exports = {
    register,
    login, logout,
};