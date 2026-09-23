const User = require("../models/User");
const Task = require("../models/Task");

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    highPriorityTasks,
  ] = await Promise.all([
    User.countDocuments(),

    Task.countDocuments(),

    Task.countDocuments({ status: "pending" }),

    Task.countDocuments({ status: "in-progress" }),

    Task.countDocuments({ status: "completed" }),

    Task.countDocuments({ priority: "high" }),
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

module.exports = {
  getDashboardStats,
};