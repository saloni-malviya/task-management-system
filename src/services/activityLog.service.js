const ActivityLog = require("../models/ActivityLog");

/**
 * Activity log create karo
 * Kabhi bhi throw nahi karta — main flow affect nahi hona chahiye
 */
const logActivity = async ({
  actor = null,
  actorRole = "user",
  action,
  entityType = null,
  entityId = null,
  entityName = null,
  metadata = {},
  req = null,
  status = "success",
}) => {
  try {
    const logData = {
      actor,
      actorRole,
      action,
      entityType,
      entityId,
      entityName,
      metadata,
      status,
    };

    if (req) {
      logData.ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        null;
    }

    await ActivityLog.create(logData);
  } catch (error) {
    // Log fail hone se main request fail NAHI hona chahiye
    console.error("Activity log failed:", error.message);
  }
};

/**
 * Logs fetch karo (filters + pagination)
 */
const getActivityLogs = async (filters = {}, page = 1, limit = 20) => {
  const query = {};

  if (filters.actor) query.actor = filters.actor;
  if (filters.action) query.action = filters.action;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.status) query.status = filters.status;

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    ActivityLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLogs: total,
      limit,
    },
  };
};

module.exports = { logActivity, getActivityLogs };