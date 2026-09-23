
const express = require("express");
const router = express.Router();

const protect  = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const adminController = require("../controllers/admin.controller");

// Admin dashboard statistics
router.get(
  "/stats",
  protect,
  authorizeRoles("admin"),
  adminController.getDashboardStats
);

module.exports = router;