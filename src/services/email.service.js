const transporter = require("../config/mail");

const sendTaskAssignedEmail = async (task, assignedUser, assignedBy) => {
  if (!assignedUser?.email) {
    throw new Error("Assigned user's email is missing");
  }

  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-IN")
    : "Not specified";

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: assignedUser.email,
    subject: `New Task Assigned: ${task.title}`,
    text: `
Hello ${assignedUser.name},

A task has been assigned to you.

Task Title: ${task.title}
Description: ${task.description || "Not specified"}
Priority: ${task.priority}
Due Date: ${dueDate}
Assigned By: ${assignedBy?.name || "Admin"}
Status: ${task.status}

Please log in to the Task Management System to view the task.

Regards,
Task Management System
`,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendTaskAssignedEmail,
};