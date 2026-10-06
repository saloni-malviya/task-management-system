const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

const reminderQueue = new Queue("reminder", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Completed jobs 7 din baad hata do
      count: 5000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Failed jobs 30 din tak rakho
    },
  },
});

module.exports = reminderQueue;