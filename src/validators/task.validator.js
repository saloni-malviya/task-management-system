const { body, param, query } = require("express-validator");

const createTaskValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Task title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("assignedTo")
    .notEmpty()
    .withMessage("Assigned user is required")
    .isMongoId()
    .withMessage("Invalid assigned user ID"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium or high"),

  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage(
      "Status must be pending, in-progress or completed"
    ),

  body("dueDate")
    .notEmpty()
    .withMessage("Due date is required")
    .isISO8601()
    .withMessage("Due date must be a valid date"),
];


const updateTaskValidator = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Task title cannot be empty")
    .isLength({ min: 3, max: 100 })
    .withMessage("Task title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Invalid assigned user ID"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium or high"),

  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Invalid task status"),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date"),
];

module.exports = {
  createTaskValidator, updateTaskValidator
};