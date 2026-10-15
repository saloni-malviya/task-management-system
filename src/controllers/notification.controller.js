const notificationService = require("../services/notification.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const fcmService = require("../services/fcm.service");
const AppError = require("../utils/AppError");
/**
 * GET /api/v1/notifications
 * Query: ?page=1&limit=20&status=all|unread|read
 */
const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = {
    status: req.query.status || "all",
  };

  const result = await notificationService.getNotifications(
    req.user.userId,
    page,
    limit,
    filter,
  );

  return sendResponse(
    res,
    200,
    "Notifications fetched successfully",
    result,
  );
});

/**
 * GET /api/v1/notifications/unread-count
 * Bell icon ke liye
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.userId);
  return sendResponse(res, 200, "Unread count fetched successfully", result);
});

/**
 * PATCH /api/v1/notifications/:id/read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user.userId,
  );

  return sendResponse(res, 200, "Notification marked as read", notification);
});

/**
 * PATCH /api/v1/notifications/read-all
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.userId);
  return sendResponse(res, 200, "All notifications marked as read", result);
});

/**
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user.userId);
  return sendResponse(res, 200, "Notification deleted successfully");
});

/**
 * DELETE /api/v1/notifications/clear-read
 */
const clearAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.clearAllRead(req.user.userId);
  return sendResponse(res, 200, "Read notifications cleared", result);
});

/**
 * POST /api/v1/notifications/register-token
 * Body: { token: "<fcm_token>" }
 */
const registerFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    throw new AppError("FCM token is required", 400);
  }

  const result = await fcmService.registerFcmToken(req.user.userId, token);
  const message = result.alreadyExisted
    ? "FCM token already registered"
    : "FCM token registered successfully";

  return sendResponse(
    res,
    200, message,
    { added: result.added,
      alreadyExisted: result.alreadyExisted,
     });
});

/**
 * DELETE /api/v1/notifications/unregister-token
 * Body: { token: "<fcm_token>" }
 * Logout pe frontend isko call kare
 */
const unregisterFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    throw new AppError("FCM token is required", 400);
  }

  const result = await fcmService.removeFcmToken(req.user.userId, token);

  return sendResponse(
    res,
    200,
    result.removed ? "FCM token removed" : "FCM token not found",
  );
});


module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
  registerFcmToken,
  unregisterFcmToken
};