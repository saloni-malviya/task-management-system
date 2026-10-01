const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);

  return sendResponse(res, 201, "User registered successfully", user);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);

  return sendResponse(res, 200, "Login successful", result);
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.user.userId);

  return sendResponse(res, 200, result.message);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);

  return sendResponse(res, 200, result.message);
});

const verifyResetOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyResetOtp(req.body.email, req.body.otp);

  return sendResponse(res, 200, "OTP verified successfully", result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(
    req.body.resetToken,
    req.body.newPassword,
  );

  return sendResponse(res, 200, result.message);
});

const resendVerificationOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationOtp(req.body.email);

  return sendResponse(res, 200, result.message);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body.email, req.body.otp);

  return sendResponse(res, 200, result.message);
});

const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshAccessToken(refreshToken);

    return sendResponse(
        res,
        200,
        "Access token refreshed successfully",
        result
    );
});

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  resendVerificationOtp,
  verifyEmail,
  refresh
};
