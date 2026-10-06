const { Worker } = require("bullmq");
const redisConnection = require("../../config/redis");
const emailService = require("../../services/email.service");
const User = require("../../models/User");

const emailWorker = new Worker(
  "email",
  async (job) => {
    const { name, data } = job;

    console.log(`📧 Processing job: ${name} (id: ${job.id})`);

    switch (name) {
      case "send-password-reset-otp": {
        const { email, otp } = data;
        const user = await User.findOne({ email }).select("name email");
        if (!user) throw new Error(`User not found: ${email}`);

        await emailService.sendPasswordResetOtpEmail(user, otp);
        break;
      }

      case "send-email-verification-otp": {
        const { email, otp } = data;
        const user = await User.findOne({ email }).select("name email");
        if (!user) throw new Error(`User not found: ${email}`);

        await emailService.sendEmailVerificationOtpEmail(user, otp);
        break;
      }

      case "send-task-assigned": {
        const { task, assignedUser, assignedBy } = data;
        await emailService.sendTaskAssignedEmail(task, assignedUser, assignedBy);
        break;
      }

      default:
        throw new Error(`Unknown job type: ${name}`);
    }

    return { success: true };
  },
  {
    connection: redisConnection,
    concurrency: 5,   // Ek saath 5 emails process karega
  }
);

emailWorker.on("completed", (job) => {
  console.log(`✅ Email job completed: ${job.name} (id: ${job.id})`);
});

emailWorker.on("failed", (job, err) => {
  console.error(
    `❌ Email job failed: ${job.name} (id: ${job.id}) — ${err.message}`
  );
});

emailWorker.on("error", (err) => {
  console.error("❌ Worker error:", err.message);
});

module.exports = emailWorker;