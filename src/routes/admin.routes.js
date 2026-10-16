const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const adminController = require("../controllers/admin.controller");

const { writeLimiter } = require("../middleware/rateLimit.middleware");

// Admin dashboard statistics
router.get(
  "/stats",
  protect,
  authorizeRoles("admin"),
  adminController.getDashboardStats,
);

router.get(
  "/users/pending",
  protect,
  authorizeRoles("admin"),
  adminController.getPendingUsers,
);

router.get(
  "/users/rejected",
  protect,
  authorizeRoles("admin"),
  adminController.getRejectedUsers,
);

router.patch(
  "/users/:id/approve",
  protect,
  authorizeRoles("admin"),
  writeLimiter,
  adminController.approveUser,
);

router.patch(
  "/users/:id/reject",
  protect,
  authorizeRoles("admin"),
  writeLimiter,
  adminController.rejectUser,
);


router.post(
  "/tasks/:id/restore",
  protect,
  authorizeRoles("admin"),
  writeLimiter,
  adminController.restoreTask,
);

router.post(
  "/users/:id/restore",
  protect,
  authorizeRoles("admin"),
  writeLimiter,
  adminController.restoreUser,
);

module.exports = router;
