const { Worker } = require("bullmq");
const redisConnection = require("../../config/redis");
const emailService = require("../../services/email.service");
const Task = require("../../models/Task");
const User = require("../../models/User");

const reminderWorker = new Worker(
  "reminder",
  async (job) => {
    const { name, data } = job;
    const { taskId, type } = data;

    console.log(`⏰ Processing reminder: ${type} (taskId: ${taskId})`);

    // Task fetch karo
    const task = await Task.findById(taskId)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    // ✅ Skip conditions
    if (!task) {
      console.log(`⏭️ Task ${taskId} not found, skipping reminder`);
      return { skipped: true, reason: "task-not-found" };
    }

    if (task.isDeleted) {
      console.log(`⏭️ Task ${taskId} is deleted, skipping reminder`);
      return { skipped: true, reason: "task-deleted" };
    }

    if (task.status === "completed") {
      console.log(`⏭️ Task ${taskId} is completed, skipping reminder`);
      return { skipped: true, reason: "task-completed" };
    }

    if (!task.assignedTo?.email) {
      console.log(`⏭️ Task ${taskId} has no assigned user email`);
      return { skipped: true, reason: "no-assigned-email" };
    }

    // Email bhejo
    await emailService.sendTaskReminderEmail(task, task.assignedTo, type);

    console.log(`✅ Reminder sent: ${type} for task ${taskId}`);
    return { sent: true, type };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

reminderWorker.on("completed", (job) => {
  console.log(`✅ Reminder job completed: ${job.name} (id: ${job.id})`);
});

reminderWorker.on("failed", (job, err) => {
  console.error(
    `❌ Reminder job failed: ${job.name} (id: ${job.id}) — ${err.message}`
  );
});

reminderWorker.on("error", (err) => {
  console.error("❌ Reminder worker error:", err.message);
});

module.exports = reminderWorker;