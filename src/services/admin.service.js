const mongoose = require("mongoose");
const User = require("../models/User");
const Task = require("../models/Task");
const AppError = require("../utils/AppError");
const { logActivity } = require("./activityLog.service");
const emailQueue = require("../queues/email.queue");
const notificationService = require("./notification.service");

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    highPriorityTasks,
    pendingUsers,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false, approvalStatus: "approved" }),

    Task.countDocuments({ isDeleted: false }),

    Task.countDocuments({ isDeleted: false, status: "pending" }),

    Task.countDocuments({ isDeleted: false, status: "in-progress" }),

    Task.countDocuments({ isDeleted: false, status: "completed" }),

    Task.countDocuments({ isDeleted: false, priority: "high" }),

    User.countDocuments({ isDeleted: false, approvalStatus: "pending" }),
  ]);

  return {
    totalUsers,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    highPriorityTasks,
    pendingUsers, 
  };
};

const restoreTask = async (taskId, adminId = null, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID", 400);
  }

  const task = await Task.findOne({
    _id: taskId,
    isDeleted: true,
  });

  if (!task) {
    throw new AppError("Deleted task not found", 404);
  }

  task.isDeleted = false;
  task.deletedAt = null;
  task.deletedBy = null;
  await task.save();

  // Log restore
  if (adminId) {
    await logActivity({
      actor: adminId,
      actorRole: "admin",
      action: "TASK_RESTORED",
      entityType: "Task",
      entityId: task._id,
      entityName: task.title,
      req,
    });
  }

  return task;
};

const restoreUser = async (userId, adminId = null, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid user ID", 400);
  }

  const user = await User.findOne({
    _id: userId,
    isDeleted: true,
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

  //  Log restore
  if (adminId) {
    await logActivity({
      actor: adminId,
      actorRole: "admin",
      action: "USER_RESTORED",
      entityType: "User",
      entityId: user._id,
      entityName: user.name,
      req,
    });
  }

  return user;
};


 // Pending users ki list (admin approval ke liye)
const getPendingUsers = async (page = 1, limit = 10, search = "") => {
  const query = {
    isDeleted: false,
    approvalStatus: "pending",
  };

  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query)
      .select("name email role approvalStatus createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPendingUsers: total,
      limit,
    },
  };
};


 // Rejected users ki list
const getRejectedUsers = async (page = 1, limit = 10, search = "") => {
  const query = {
    isDeleted: false,
    approvalStatus: "rejected",
  };

  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query)
      .select("name email role approvalStatus rejectedAt rejectionReason createdAt")
      .sort({ rejectedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(query),
  ]);
   return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRejectedUsers: total,
      limit,
    },
  };
};

 // User ko approve karo
const approveUser = async (userId, adminId = null, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid user ID", 400);
  }

  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.approvalStatus === "approved") {
    throw new AppError("User is already approved", 400);
  }

  user.approvalStatus = "approved";
  user.approvedBy = adminId;
  user.approvedAt = new Date();
  user.rejectedBy = null;
  user.rejectedAt = null;
  user.rejectionReason = null;

  await user.save();

  // ✅ Email queue me bhejo
  try {
    await emailQueue.add("send-account-approved", {
      email: user.email,
    });
    console.log(`📧 Approval email queued for ${user.email}`);
  } catch (error) {
    console.error("Approval email queue failed:", error.message);
  }

  // Log
  if (adminId) {
    await logActivity({
      actor: adminId,
      actorRole: "admin",
      action: "USER_APPROVED",
      entityType: "User",
      entityId: user._id,
      entityName: user.name,
      metadata: { email: user.email },
      req,
    });
  }

  // ✅ User ko in-app notification bhejo
  try {
    if (adminId) {
      await notificationService.createNotification({
        recipient: user._id,
        sender: adminId,
        type: "user_approved",
        title: "Account Approved",
        message: "Your account has been approved. You can now login.",
        metadata: { approvedBy: adminId },
      });
      console.log(`🔔 Approval notification sent to ${user.email}`);
    }
  } catch (error) {
    console.error("User approval notification failed:", error.message);
  }

  return user;
};

// User ko reject karo
const rejectUser = async (userId, reason = null, adminId = null, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid user ID", 400);
  }

  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.approvalStatus === "rejected") {
    throw new AppError("User is already rejected", 400);
  }

  if (user.role === "admin") {
    throw new AppError("Cannot reject an admin user", 403);
  }

  user.approvalStatus = "rejected";
  user.rejectedBy = adminId;
  user.rejectedAt = new Date();
  user.rejectionReason = reason || "No reason provided";
  user.approvedBy = null;
  user.approvedAt = null;

  // Token invalidate karo (agar koi session hai)
  user.tokenVersion += 1;
  user.refreshTokenVersion += 1;

  await user.save();

  // ✅ Rejection email queue me bhejo
  try {
    await emailQueue.add("send-account-rejected", {
      email: user.email,
      reason: user.rejectionReason,
    });
    console.log(`📧 Rejection email queued for ${user.email}`);
  } catch (error) {
    console.error("Rejection email queue failed:", error.message);
  }

  // Log
  if (adminId) {
    await logActivity({
      actor: adminId,
      actorRole: "admin",
      action: "USER_REJECTED",
      entityType: "User",
      entityId: user._id,
      entityName: user.name,
      metadata: { email: user.email, reason },
      req,
    });
    }

    // ✅ User ko in-app notification bhejo
  try {
    if (adminId) {
      await notificationService.createNotification({
        recipient: user._id,
        sender: adminId,
        type: "user_rejected",
        title: "Account Rejected",
        message: reason
          ? `Your account was rejected. Reason: ${reason}`
          : "Your account registration was rejected.",
        metadata: { rejectedBy: adminId, reason },
      });
      console.log(`🔔 Rejection notification sent to ${user.email}`);
    }
  } catch (error) {
    console.error("User rejection notification failed:", error.message);
  }

  return user;
};

/**
 * Pending users count (dashboard ke liye)
 */
const getPendingUsersCount = async () => {
  return User.countDocuments({
    isDeleted: false,
    approvalStatus: "pending",
  });
};



module.exports = {
  getDashboardStats,
  restoreTask,
  restoreUser,
  getPendingUsers,     
  getRejectedUsers,       
  approveUser,            
  rejectUser,             
  getPendingUsersCount,  
};
