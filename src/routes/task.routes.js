const express = require("express");

const taskController = require("../controllers/task.controller");
const protect = require("../middleware/auth.middleware");
const {
  createTaskValidator, updateTaskValidator
} = require("../validators/task.validator");
const validate = require("../middleware/validation.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const router = express.Router();

router.post(
  "/",
  protect, 
  createTaskValidator,
  validate,
  taskController.createTask
);

router.get(
  "/",
  protect,
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
  updateTaskValidator,
  validate,
  taskController.updateTask
);

router.delete(
  "/:id",
  protect,
  taskController.deleteTask
);

module.exports = router;