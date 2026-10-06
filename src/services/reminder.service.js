const reminderQueue = require("../queues/reminder.queue");
const Task = require("../models/Task");

// Reminder timing — subah 9 baje
const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;

// ⚠️ TESTING ke liye ye use karo (delay in seconds)
// Production me isse comment karo aur neeche wala use karo
const TEST_MODE = false;             // ← Testing ke waqt true karo
const TEST_DELAY_SECONDS = 30;       // ← 30 sec me reminder chale

/**
 * Ek reminder time calculate karo
 * @param {Date} dueDate - task ki due date
 * @param {number} dayOffset - -1 (1 din pehle), 0 (due date), +1 (overdue)
 * @returns {Date} reminder ka exact time
 */
const calculateReminderTime = (dueDate, dayOffset) => {
  const reminderTime = new Date(dueDate);
  reminderTime.setDate(reminderTime.getDate() + dayOffset);
  reminderTime.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  return reminderTime;
};

/**
 * Task ke liye 3 reminders schedule karo
 * Returns: [jobId1, jobId2, jobId3]
 */
const scheduleTaskReminders = async (task) => {
  if (!task.dueDate) return [];

  const dueDate = new Date(task.dueDate);
  const now = Date.now();

  // 3 reminder times
  const reminders = [
    { type: "before-due", time: calculateReminderTime(dueDate, -1) },
    { type: "on-due", time: calculateReminderTime(dueDate, 0) },
    { type: "overdue", time: calculateReminderTime(dueDate, 1) },
  ];

  const jobIds = [];

  for (const reminder of reminders) {
    let delay;

    if (TEST_MODE) {
      // 🧪 Test mode — sab reminders 30 sec me
      delay = TEST_DELAY_SECONDS * 1000;
    } else {
      // Production — actual time difference
      delay = reminder.time.getTime() - now;

      // Agar past me hai (negative delay), skip karo
      if (delay < 0) {
        console.log(
          `⏭️ Skipping ${reminder.type} reminder for task ${task._id} (already past)`
        );
        continue;
      }
    }

    try {
      const job = await reminderQueue.add(
        "send-task-reminder",
        {
          taskId: task._id.toString(),
          type: reminder.type,
        },
        { delay }
      );

      jobIds.push(job.id);
      console.log(
        `📅 Scheduled ${reminder.type} reminder for task ${task._id} (job: ${job.id}, delay: ${Math.round(delay / 1000)}s)`
      );
    } catch (error) {
      console.error(
        `❌ Failed to schedule ${reminder.type} reminder:`,
        error.message
      );
    }
  }

  return jobIds;
};

/**
 * Task ke saare reminder jobs cancel karo
 */
const cancelTaskReminders = async (task) => {
  // Task se job IDs nikalo (select false tha, isliye explicit select)
  const taskWithJobs = await Task.findById(task._id).select(
    "+reminderJobIds"
  );

  if (
    !taskWithJobs ||
    !taskWithJobs.reminderJobIds ||
    taskWithJobs.reminderJobIds.length === 0
  ) {
    return 0;
  }

  let removedCount = 0;

  for (const jobId of taskWithJobs.reminderJobIds) {
    try {
      const job = await reminderQueue.getJob(jobId);

      if (job) {
        await job.remove();
        removedCount++;
        console.log(`🗑️ Removed reminder job ${jobId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to remove job ${jobId}:`, error.message);
    }
  }

  // Task se job IDs clear karo
  await Task.findByIdAndUpdate(task._id, { reminderJobIds: [] });

  return removedCount;
};

module.exports = {
  scheduleTaskReminders,
  cancelTaskReminders,
};