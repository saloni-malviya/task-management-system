const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

const emailQueue = new Queue("email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,              // Fail hone pe 3 baar try karega
    backoff: {
      type: "exponential",    // 2s, 4s, 8s ke gap se retry
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600,         // Completed jobs 24 ghante baad hata do
      count: 1000,            // Ya max 1000 rakho
    },
    removeOnFail: {
      age: 7 * 24 * 3600,     // Failed jobs 7 din tak rakho (debugging ke liye)
    },
  },
});

module.exports = emailQueue;