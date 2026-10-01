const mongoose = require("mongoose");
const User = require("../models/User");
const Task = require("../models/Task");
const AppError = require("../utils/AppError");

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    highPriorityTasks,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),

    Task.countDocuments({ isDeleted: false }),

    Task.countDocuments({ isDeleted: false, status: "pending" }),

    Task.countDocuments({ isDeleted: false, status: "in-progress" }),

    Task.countDocuments({ isDeleted: false, status: "completed" }),

    Task.countDocuments({ isDeleted: false, priority: "high" }),
  ]);

  return {
    totalUsers,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    highPriorityTasks,
  };
};

const restoreTask = async (taskId) => {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new AppError("Invalid task ID", 400);
    }

    const task = await Task.findOne({
        _id: taskId,
        isDeleted: true
    });

    if (!task) {
        throw new AppError("Deleted task not found", 404);
    }

    task.isDeleted = false;
    task.deletedAt = null;
    task.deletedBy = null;
    await task.save();

    return task;
};

const restoreUser = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Invalid user ID", 400);
    }

    const user = await User.findOne({
        _id: userId,
        isDeleted: true
    });

    if (!user) {
        throw new AppError("Deleted user not found", 404);
    }

    user.isDeleted = false;
    user.deletedAt = null;
    user.deletedBy = null;

    // Saare purane tokens invalid karo
    user.tokenVersion += 1;
    user.refreshTokenVersion += 1;

    await user.save();

    return user;
};

module.exports = {
  getDashboardStats, restoreTask, restoreUser
};