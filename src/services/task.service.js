const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const emailService = require("./email.service");

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

  // Send assignment notification without failing task creation
try {
  const assignedBy = await User.findById(createdBy);

  await emailService.sendTaskAssignedEmail(
    task,
    assignedUser,
    assignedBy
  );
} catch (error) {
  console.error("Task assignment email failed:", error.message);
}


  return task;
};

/*
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
}; */


const getTasks = async (
  userId,
  role,
  page = 1,
  limit = 10,
  query = {}
) => {
  const {
    search,
    status,
    priority,
    assignedTo,
    sortBy,
    order,
  } = query;

  // Build task filters
  const conditions = [];

  // Normal user: only created or assigned tasks
  if (role !== "admin") {
    conditions.push({
      $or: [
        { createdBy: userId },
        { assignedTo: userId },
      ],
    });
  }

  // Search by task title (case-insensitive)
  if (search && search.trim()) {
    conditions.push({
      title: {
        $regex: search.trim(),
        $options: "i",
      },
    });
  }

  // Filter by status
  if (status) {
    conditions.push({ status });
  }

  // Filter by priority
  if (priority) {
    conditions.push({ priority });
  }

  // Filter by assigned user
  if (assignedTo) {
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      throw new AppError("Invalid assigned user ID", 400);
    }

    conditions.push({ assignedTo });
  }

  // Combine all conditions safely
  const filter =
    conditions.length > 0
      ? { $and: conditions }
      : {};

  // Allow only supported sorting fields
  const allowedSortFields = [
    "dueDate",
    "createdAt",
    "priority",
  ];

  const finalSortBy = allowedSortFields.includes(sortBy)
    ? sortBy
    : "createdAt";

  const sortOrder = order === "asc" ? 1 : -1;

  const sort = {
    [finalSortBy]: sortOrder,
  };

  const skip = (page - 1) * limit;

  const [tasks, totalTasks] = await Promise.all([
    Task.find(filter)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort(sort)
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


const updateTask = async (taskId, updateData, userId, role) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID", 400);
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const receivedFields = Object.keys(updateData);

  if (receivedFields.length === 0) {
    throw new AppError("No fields provided for update", 400);
  }

  // Normal user can update only status
  if (role !== "admin") {
    const isAssignedUser =
      task.assignedTo.toString() === userId;

    if (!isAssignedUser) {
      throw new AppError(
        "You are not authorized to update this task",
        403
      );
    }

    const onlyStatusField =
      receivedFields.length === 1 &&
      receivedFields[0] === "status";

    if (!onlyStatusField) {
      throw new AppError(
        "You can only update task status",
        403
      );
    }
  }

  // Admin can update these fields
  const allowedFields = [
    "title",
    "description",
    "assignedTo",
    "status",
    "priority",
    "dueDate",
  ];

  const invalidFields = receivedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    throw new AppError(
      `You cannot update: ${invalidFields.join(", ")}`,
      400
    );
  }

  // Check new assignee if admin is reassigning
  
let newAssignedUser = null;

const isReassignment =
  updateData.assignedTo &&
  updateData.assignedTo.toString() !==
    task.assignedTo.toString();

if (isReassignment) {
  if (!mongoose.Types.ObjectId.isValid(updateData.assignedTo)) {
    throw new AppError("Invalid assigned user ID", 400);
  }

  newAssignedUser = await User.findById(
    updateData.assignedTo
  );

  if (!newAssignedUser) {
    throw new AppError("Assigned user not found", 404);
  }
}

  Object.assign(task, updateData);

  await task.save();

  
if (isReassignment) {
  try {
    const assignedBy = await User.findById(userId);

    await emailService.sendTaskAssignedEmail(
      task,
      newAssignedUser,
      assignedBy
    );
  } catch (error) {
    console.error("Task reassignment email failed:", error.message);
  }
}

  return await Task.findById(task._id)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");
};


const deleteTask = async (taskId, role) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID", 400);
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  if (role !== "admin") {
    throw new AppError(
      "Only admin can delete tasks",
      403
    );
  }

  await Task.findByIdAndDelete(taskId);

  return task;
};


module.exports = {
  createTask, getTasks, getTaskById, updateTask, deleteTask
};