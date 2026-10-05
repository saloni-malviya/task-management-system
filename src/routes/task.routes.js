const express = require("express");

const taskController = require("../controllers/task.controller");
const protect = require("../middleware/auth.middleware");
const {
  createTaskValidator, updateTaskValidator
} = require("../validators/task.validator");
const validate = require("../middleware/validation.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const { writeLimiter, searchLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post(
  "/",
  protect, 
  writeLimiter,
  createTaskValidator,
  validate,
  taskController.createTask
);

router.get(
  "/",
  protect,
  searchLimiter,
  taskController.getTasks
);

router.get(
  "/:id",
  protect,
  taskController.getTaskById
);

router.patch(
  "/:id",
  protect,
  writeLimiter,
  updateTaskValidator,
  validate,
  taskController.updateTask
);

router.delete(
  "/:id",
  protect,
  writeLimiter,
  taskController.deleteTask
);

module.exports = router;