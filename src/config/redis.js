const Redis = require("ioredis");
const env = require("./env");

const redisConnection = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    maxRetriesPerRequest: null,   //bullmq ke liye jruri
    enableReadyCheck: false,
});

redisConnection.on("connect", () => {
    console.log("Redis connected");
});

redisConnection.on("error", (err) => {
    console.log("Redis Error:", err.message);
});

module.exports = redisConnection;
