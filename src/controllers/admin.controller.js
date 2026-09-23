const adminService = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse  = require("../utils/response");

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();

  return sendResponse(
    res,
    200,
    "Dashboard statistics fetched successfully",
    stats
  );
});

module.exports = {
  getDashboardStats,
};