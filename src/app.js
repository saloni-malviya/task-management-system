const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const notFound = require("./middleware/notFound.middleware");
const errorHandler = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const taskRoutes =  require("./routes/task.routes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(helmet());

app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Task Management API is running"
    });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/tasks", taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;