const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const createTask = async (taskData, createdBy) => {
  const { title, description, assignedTo, priority, status, dueDate } = taskData;

  // Check assigned user ID format
  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    throw new AppError("Invalid assigned user ID", 400);
  }

  // Check whether assigned user exists
  const assignedUser = await User.findById(assignedTo);

  if (!assignedUser) {
    throw new AppError("Assigned user not found", 404);
  }

  // Create task
  const task = await Task.create({
    title,
    description,
    assignedTo,
    createdBy,
    priority,
    status,
    dueDate,
  });

  return task;
};

const getTasks = async (userId, role, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  let filter = {};

  if (role !== "admin") {
    filter = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId },
      ],
    };
  }

  const [tasks, totalTasks] = await Promise.all([
    Task.find(filter)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
      totalTasks,
      limit,
    },
  };
};

const getTaskById = async (taskId, userId, role) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID", 400);
  }

  const task = await Task.findById(taskId)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  // Admin can access any task
  if (role === "admin") {
    return task;
  }

  // Normal user can access only their own/assigned task
  const isOwner =
    task.createdBy._id.toString() === userId ||
    task.assignedTo._id.toString() === userId;

  if (!isOwner) {
    throw new AppError(
      "You are not authorized to access this task",
      403
    );
  }

  return task;
};

module.exports = {
  createTask, getTasks, getTaskById
};