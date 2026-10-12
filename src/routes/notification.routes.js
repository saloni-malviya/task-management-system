const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
} = require("../controllers/notification.controller");

const { writeLimiter } = require("../middleware/rateLimit.middleware");

// ⚠️ IMPORTANT: Specific routes PEHLE likhna
// Warna Express /:id ko match kar lega

// Get unread count (bell icon ke liye)
router.get("/unread-count", protect, getUnreadCount);

// Mark all as read (specific action route)
router.patch("/read-all", protect, writeLimiter, markAllAsRead);

// Clear all read notifications
router.delete("/clear-read", protect, writeLimiter, clearAllRead);

// Get notifications list
router.get("/", protect, getNotifications);

// Mark single notification as read
router.patch("/:id/read", protect, writeLimiter, markAsRead);

// Delete single notification
router.delete("/:id", protect, writeLimiter, deleteNotification);

module.exports = router;