
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [3, "Task title must be at least 3 characters"],
      maxlength: [100, "Task title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned user is required"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task creator is required"],
    },

    status: {
      type: String,
      enum: {
        values: ["pending", "in-progress", "completed"],
        message: "Invalid task status",
      },
      default: "pending",
    },

    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "Invalid task priority",
      },
      default: "medium",
    },

    dueDate: {
      type: Date,
      required: [true, "Task due date is required"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);