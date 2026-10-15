const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const fcmService = require("./fcm.service"); 

/**
 * Core function — Notification create karo
 * Isko har jagah call karenge jaha notification bhejni hai
 */
const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  relatedId = null,
  metadata = {},
}) => {
  try {
    if (!recipient || !sender) {
  console.error("Notification: recipient/sender missing");
  return null;
}
    // Khud ko notification mat bhejo
    if (recipient.toString() === sender.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      relatedId,
      metadata,
    });

    // Future mein yaha FCM push bhi add karenge (Option B)
    // await sendPush(recipient, { title, message });

    return notification;
  } catch (error) {
    // Notification fail hone se main flow fail NAHI hona chahiye
    console.error("Notification create failed:", error.message);
    return null;
  }
};

/**
 * 🔔 Task-related notification ka helper
 * Common structure (relatedId, taskTitle) automatically handle karta hai
 */
const notifyTaskEvent = async ({
  task,
  recipient,
  sender,
  type,
  title,
  message,
  metadata = {},
  includeRelatedId = true,
}) => {

  //mongodb me save (inAPP ke liye)
  const notification = await createNotification({
    recipient,
    sender,
    type,
    title,
    message,
    relatedId: includeRelatedId ? task._id : null,
    metadata: {
      taskTitle: task.title,
      ...metadata,
    },
  });

  // 2. FCM push bhejo (push notification ke liye — Option B)
  if (notification) {
    await fcmService.sendPushToUser(recipient, {
      title: title,
      body: message,
      data: {
        type: type,
        taskId: task._id.toString(),
        notificationId: notification._id.toString(),
        screen: "task-details",
      },
    });
  }

  return notification;


};


/**
 * User ki notifications fetch karo (pagination ke saath)
 */
const getNotifications = async (userId, page = 1, limit = 20, filter = {}) => {
  const query = { recipient: userId };

  // filter: "all" | "unread" | "read"
  if (filter.status === "unread") query.isRead = false;
  if (filter.status === "read") query.isRead = true;

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate("sender", "name email role")
      .populate("relatedId", "title status priority dueDate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(query),

    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      limit,
    },
  };
};

/**
 * Unread count nikalo (bell icon ke liye)
 */
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  return { unreadCount: count };
};

/**
 * Ek notification ko read mark karo
 */
const markAsRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError("Invalid notification ID", 400);
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (notification.isRead) {
    return notification; // Already read
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

/**
 * Saari notifications read mark karo
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );

  return { modifiedCount: result.modifiedCount };
};

/**
 * Notification delete karo
 */
const deleteNotification = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError("Invalid notification ID", 400);
  }

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return notification;
};

/**
 * Saari read notifications clear karo
 */
const clearAllRead = async (userId) => {
  const result = await Notification.deleteMany({
    recipient: userId,
    isRead: true,
  });

  return { deletedCount: result.deletedCount };
};

module.exports = {
  createNotification, notifyTaskEvent,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
};