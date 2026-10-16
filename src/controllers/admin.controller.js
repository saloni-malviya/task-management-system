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
  const task = await adminService.restoreTask(
    req.params.id,
    req.user.userId,
    req,
  );

  return sendResponse(res, 200, "Task restored successfully", task);
});

const restoreUser = asyncHandler(async (req, res) => {
  const user = await adminService.restoreUser(
    req.params.id,
    req.user.userId,
    req,
  );

  return sendResponse(res, 200, "User restored successfully", user);
});

// ===== NAYA — Pending/Rejected/Approve/Reject =====

const getPendingUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const search = req.query.search || "";

  const result = await adminService.getPendingUsers(page, limit, search);
  return sendResponse(res, 200, "Pending users fetched successfully", result);
});

const getRejectedUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const search = req.query.search || "";

  const result = await adminService.getRejectedUsers(page, limit, search);
  return sendResponse(res, 200, "Rejected users fetched successfully", result);
});

const approveUser = asyncHandler(async (req, res) => {
  const user = await adminService.approveUser(
    req.params.id,
    req.user.userId,
    req,
  );
  return sendResponse(res, 200, "User approved successfully", user);
});

const rejectUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const user = await adminService.rejectUser(
    req.params.id,
    reason,
    req.user.userId,
    req,
  );
  return sendResponse(res, 200, "User rejected successfully", user);
});

module.exports = {
  getDashboardStats,
  restoreTask,
  restoreUser,
   getPendingUsers,     
  getRejectedUsers, 
  approveUser,         
  rejectUser,          
};
