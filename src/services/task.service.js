const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const emailService = require("./email.service");
const emailQueue = require("../queues/email.queue");
const { logActivity } = require("./activityLog.service");
const reminderService = require("./reminder.service"); 

const createTask = async (taskData, createdBy, req = null) => {
  const { title, description, assignedTo, priority, status, dueDate } = taskData;

  // Check assigned user ID format
  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    throw new AppError("Invalid assigned user ID", 400);
  }

  // Check whether assigned user exists
  const assignedUser = await User.findOne({ _id: assignedTo, isDeleted: false });

  if (!assignedUser) {
    throw new AppError("Assigned user not found", 404);
  }

  // Get creator details
  const creator = await User.findById(createdBy);

  if (!creator) {
    throw new AppError("Creator user not found", 404);
  }

  // Normal user needs permission to create tasks
if (
  creator.role !== "admin" &&
  creator.canCreateTask !== true
) {
  throw new AppError(
    "You do not have permission to create tasks",
    403
  );
}

  // Normal user can create task only for themselves
  if (
    creator.role !== "admin" &&
    assignedTo.toString() !== createdBy.toString()
  ) {
    throw new AppError(
      "You can create a task only for yourself",
      403
    );
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

  // Log task created
  await logActivity({
    actor: createdBy,
    actorRole: creator.role,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task._id,
    entityName: task.title,
    metadata: {
      assignedTo: assignedUser.name,
      priority: task.priority,
      status: task.status,
    },
    req,
  });

  // Send assignment notification without failing task creation
try {
 /* const assignedBy = creator;

  await emailService.sendTaskAssignedEmail(
    task,
    assignedUser,
    assignedBy
  );*/
  await emailQueue.add("send-task-assigned", {
    task: {
      _id: task._id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
    },
    assignedUser: {
      name: assignedUser.name,
      email: assignedUser.email,
    },
    assignedBy: {
      name: creator.name,
      email: creator.email,
    },
  });
} catch (error) {
  console.error("Task assignment email queue failed:", error.message);
}

// Task create hone pe reminders schedule karo
  try {
    const jobIds = await reminderService.scheduleTaskReminders(task);

    if (jobIds.length > 0) {
      await Task.findByIdAndUpdate(task._id, {
        reminderJobIds: jobIds,
      });
    }
  } catch (error) {
    console.error("Failed to schedule reminders:", error.message);
    // ⚠️ Throw nahi karo — task create ho gaya, reminder fail ho sakta hai
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
  const includeDeleted = query.includeDeleted === "true" && role === "admin";
  const onlyDeleted = query.onlyDeleted === "true" && role === "admin";

  if(onlyDeleted) {
    //sirf delete vale
    conditions.push({ isDeleted: true});
  }

   else if (!includeDeleted) {
    //default - sirf active vale
      conditions.push({ isDeleted: false });
    }

  // Normal user: only created or assigned tasks dekh skta h
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

  //check id format valid h ya nhi
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID", 400);
  }
   //check task exist krta hai ya nhi
  const task = await Task.findOne({ _id: taskId, isDeleted: false })
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


const updateTask = async (taskId, updateData, userId, role, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID", 400);
  }

  const task = await Task.findOne({ _id: taskId, isDeleted: false });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const receivedFields = Object.keys(updateData);

  if (receivedFields.length === 0) {
    throw new AppError("No fields provided for update", 400);
  }

  // Update se PEHLE old values snapshot
  const oldValues = {};
  for (const key of receivedFields) {
    oldValues[key] = task[key];
  }

  
  // Admin can update these fields
  if(role === "admin") {
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

  newAssignedUser = await User.findOne({
    _id: updateData.assignedTo,
    isDeleted: false
});

  if (!newAssignedUser) {
    throw new AppError("Assigned user not found", 404);
  }
}

  Object.assign(task, updateData);

  await task.save();

  // Status change ka special log
    if (
      updateData.status &&
      oldValues.status &&
      oldValues.status !== updateData.status
    ) {
      await logActivity({
        actor: userId,
        actorRole: role,
        action: "TASK_STATUS_CHANGED",
        entityType: "Task",
        entityId: task._id,
        entityName: task.title,
        metadata: {
          oldStatus: oldValues.status,
          newStatus: updateData.status,
        },
        req,
      });
    } else {
      // Normal update log
      await logActivity({
        actor: userId,
        actorRole: role,
        action: "TASK_UPDATED",
        entityType: "Task",
        entityId: task._id,
        entityName: task.title,
        metadata: {
          changedFields: receivedFields,
          oldValues,
          newValues: updateData,
        },
        req,
      });
    }

    // Reminder reschedule logic
    await handleReminderChanges(task, oldValues, updateData);


  
if (isReassignment) {
  try {
    const assignedBy = await User.findById(userId);

  /*  await emailService.sendTaskAssignedEmail(
      task,
      newAssignedUser,
      assignedBy
    ); */

    await emailQueue.add("send-task-assigned", {
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
      },
      assignedUser: {
        name: newAssignedUser.name,
        email: newAssignedUser.email,
      },
       assignedBy: {
        name: assignedBy.name,
        email: assignedBy.email,
      },
    });

  } catch (error) {
    console.error("Task reassignment email queue failed:", error.message);
  }
}

  return await Task.findById(task._id)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");
}

// Normal user permissions
  // ------------------------------------------------

  const isCreator =
    task.createdBy.toString() === userId.toString();

  const isAssignedUser =
    task.assignedTo.toString() === userId.toString();

  // User-created task
  if (isCreator) {

    // User needs permission to manage their own created tasks
    const creator = await User.findById(userId);

    if (!creator) {
        throw new AppError("User not found", 404);
    }

    if (creator.canCreateTask !== true) {
        throw new AppError(
            "You do not have permission to manage your created tasks",
            403
        );
    }


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

    // User cannot assign their own task to another user
    if (
      updateData.assignedTo &&
      updateData.assignedTo.toString() !== userId.toString()
    ) {
      throw new AppError(
        "You can assign your task only to yourself",
        403
      );
    }
    Object.assign(task, updateData);

    await task.save();

    //Status change ya normal update log
    if (
      updateData.status &&
      oldValues.status &&
      oldValues.status !== updateData.status
    ) {
      await logActivity({
        actor: userId,
        actorRole: role,
        action: "TASK_STATUS_CHANGED",
        entityType: "Task",
        entityId: task._id,
        entityName: task.title,
        metadata: {
          oldStatus: oldValues.status,
          newStatus: updateData.status,
        },
        req,
      });
    } else {
       await logActivity({
        actor: userId,
        actorRole: role,
        action: "TASK_UPDATED",
        entityType: "Task",
        entityId: task._id,
        entityName: task.title,
        metadata: {
          changedFields: receivedFields,
          oldValues,
          newValues: updateData,
        },
        req,
      });
    }

    // NAYA — Reminder reschedule logic
    await handleReminderChanges(task, oldValues, updateData);

    return await Task.findById(task._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");
  }

  // Admin-created task assigned to this user
  if (isAssignedUser) {

    const onlyStatusField =
      receivedFields.length === 1 &&
      receivedFields[0] === "status";

    if (!onlyStatusField) {
      throw new AppError(
        "You can only update task status",
        403
      );
    }

    task.status = updateData.status;
    await task.save();

     // Status change log
    if (oldValues.status !== updateData.status) {
      await logActivity({
        actor: userId,
        actorRole: role,
        action: "TASK_STATUS_CHANGED",
        entityType: "Task",
        entityId: task._id,
        entityName: task.title,
        metadata: {
          oldStatus: oldValues.status,
          newStatus: updateData.status,
        },
        req,
      });
    }
    // NAYA — Status complete hua to reminders cancel
    if (updateData.status === "completed") {
      await reminderService.cancelTaskReminders(task);
    }

    return await Task.findById(task._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");
  }

  // User has no access to this task
  throw new AppError(
    "You are not authorized to update this task",
    403
  );
};

// ============================================
// HELPER — Reminder changes handle karo
// ============================================
/**
 * Task update hone pe reminders ko adjust karo:
 * - Due date badli → purani cancel, nayi schedule
 * - Status completed → sab cancel
 */
const handleReminderChanges = async (task, oldValues, updateData) => {
  try {
    const dueDateChanged =
      updateData.dueDate &&
      oldValues.dueDate &&
      new Date(oldValues.dueDate).getTime() !==
        new Date(updateData.dueDate).getTime();

        const statusChanged =
      updateData.status &&
      oldValues.status &&
      oldValues.status !== updateData.status;

    if (dueDateChanged) {
      // Purani reminders cancel
      await reminderService.cancelTaskReminders(task);

      // Nayi reminders schedule
      const jobIds = await reminderService.scheduleTaskReminders(task);

      await Task.findByIdAndUpdate(task._id, {
        reminderJobIds: jobIds,
      });
       console.log(`🔄 Rescheduled reminders for task ${task._id}`);
    }

    if (statusChanged && updateData.status === "completed") {
      // Task complete hua — reminders ki zaroorat nahi
      await reminderService.cancelTaskReminders(task);
      console.log(`Cancelled reminders (task completed) ${task._id}`);
    }
  } catch (error) {
    console.error("Reminder update failed:", error.message);
    // Throw nahi karo — main update ho gaya, reminder adjust fail ho sakta hai
  }
};



const deleteTask = async (taskId, userId, role, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID", 400);
  }

  const task = await Task.findOne({ _id: taskId, isDeleted: false });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  //Admin can delete any task
  if (role === "admin") {
    task.isDeleted = true;
    task.deletedAt = new Date();
    task.deletedBy = userId;
     await task.save();
   // await Task.findByIdAndDelete(taskId);

   //  Task delete hua, reminders cancel karo
await reminderService.cancelTaskReminders(task);

   // Log delete
    await logActivity({
      actor: userId,
      actorRole: role,
      action: "TASK_DELETED",
      entityType: "Task",
      entityId: task._id,
      entityName: task.title,
      metadata: { softDelete: true },
      req,
    });

    return task;
  }

  //Normal user can delete only the task created by themselves
  const isCreator = task.createdBy.toString() === userId.toString();
  if(!isCreator) {
    throw new AppError("You can only delete tasks created by yourself", 403);
  }

  const user = await User.findById(userId);

if (!user) {
    throw new AppError("User not found", 404);
}

if (user.canCreateTask !== true) {
    throw new AppError(
        "You do not have permission to delete your created tasks",
        403
    );
}

  //await Task.findByIdAndDelete(taskId);
  task.isDeleted = true;
  task.deletedAt = new Date();
  task.deletedBy = userId;
    await task.save();

    //Task delete hua, reminders cancel karo
await reminderService.cancelTaskReminders(task);

     // Log delete
  await logActivity({
    actor: userId,
    actorRole: role,
    action: "TASK_DELETED",
    entityType: "Task",
    entityId: task._id,
    entityName: task.title,
    metadata: { softDelete: true },
    req,
  });

  return task;
};


module.exports = {
  createTask, getTasks, getTaskById, updateTask, deleteTask
};