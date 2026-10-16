const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Query fast karne ke liye
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "task_assigned",        // admin → user
        "task_updated",         // admin → user
        "task_reassigned",      // admin → user (naya user)
        "task_deleted",         // admin → user
        "task_status_changed",  // dono directions
        "task_completed",       // user → admin (special case)
        "user_registration_pending",  // user → admin
        "user_approved",              // admin → user
        "user_rejected",              // admin → user
      ],
    },

    title: {
      type: String,
      required: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Kis task se related hai (click karne pe navigate karne ke liye)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    // Extra data (old status, new status, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  },
);

// Compound index — user ki unread notifications fast query ke liye
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// 30 din baad auto-delete (optional, tumhare activity logs jaisa)
// notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model("Notification", notificationSchema);