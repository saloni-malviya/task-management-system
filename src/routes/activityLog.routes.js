const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const AppError = require("../utils/AppError");
const activityLogService = require("../services/activityLog.service");

/**
 * Admin — saare logs dekhe (filters ke saath)
 * GET /api/v1/activity-logs
 */
router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filters = {};
    if (req.query.actor) filters.actor = req.query.actor;
    if (req.query.action) filters.action = req.query.action;
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.entityId) filters.entityId = req.query.entityId;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const result = await activityLogService.getActivityLogs(
      filters,
      page,
      limit
    );

    return sendResponse(res, 200, "Activity logs fetched successfully", result);
  })
);

/**
 * User — apni activity dekhe
 * GET /api/v1/activity-logs/me
 */
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filters = { actor: req.user.userId };
    if (req.query.action) filters.action = req.query.action;
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const result = await activityLogService.getActivityLogs(
      filters,
      page,
      limit
    );

    return sendResponse(res, 200, "Your activity fetched successfully", result);
  })
);

/**
 * Kisi ek entity ki timeline
 * GET /api/v1/activity-logs/entity/:entityType/:entityId
 */
router.get(
  "/entity/:entityType/:entityId",
  protect,
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;

    const allowedTypes = ["Task", "User"];
    if (!allowedTypes.includes(entityType)) {
      throw new AppError("Invalid entity type", 400);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filters = { entityType, entityId };

    const result = await activityLogService.getActivityLogs(
      filters,
      page,
      limit
    );

    return sendResponse(
      res,
      200,
      `${entityType} activity fetched successfully`,
      result
    );
  })
);

module.exports = router;