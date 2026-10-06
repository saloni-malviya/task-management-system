const app = require("./app");
const env = require("./config/env");
const connectDB = require("./config/db");
const redisConnection = require("./config/redis");
const emailWorker = require("./queues/workers/email.worker");
const reminderWorker = require("./queues/workers/reminder.worker");

const startServer = async () => {
    await connectDB();

    app.listen(env.port, () => {
        console.log(`Server running on port ${env.port}`);
        console.log(`Email worker is running in background`);
        console.log(`Reminder worker is running in background`); 
    });
};

// ✅ Graceful shutdown — Ctrl+C dabane pe clean exit
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    await emailWorker.close();
    await reminderWorker.close();
    await redisConnection.quit();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    await emailWorker.close();
    await reminderWorker.close();
    await redisConnection.quit();
    process.exit(0);
});

startServer();
