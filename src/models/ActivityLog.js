const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    actorRole: {
      type: String,
      enum: ["user", "admin", "system"],
      default: "user",
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    entityType: {
      type: String,
      enum: ["User", "Task", "Auth", null],
      default: null,
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    entityName: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
      index: true,
    },
  },
  { timestamps: true }
);

// Performance indexes
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

// 90 din baad auto-delete (TTL)
activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 3600 }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);