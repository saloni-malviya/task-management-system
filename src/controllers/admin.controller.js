const adminService = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();

  return sendResponse(
    res,
    200,
    "Dashboard statistics fetched successfully",
    stats,
  );
});

const restoreTask = asyncHandler(async (req, res) => {
    const task = await adminService.restoreTask(req.params.id);

    return sendResponse(
        res,
        200,
        "Task restored successfully",
        task
    );
});

const restoreUser = asyncHandler(async (req, res) => {
    const user = await adminService.restoreUser(req.params.id);

    return sendResponse(
        res,
        200,
        "User restored successfully",
        user
    );
});

module.exports = {
  getDashboardStats, restoreTask, restoreUser
};
