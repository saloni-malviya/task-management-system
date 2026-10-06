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

const sendPasswordResetOtpEmail = async (
    user,
    otp
) => {
    if (!user?.email) {
        throw new Error(
            "User email is missing"
        );
    }

    const mailOptions = {
        from:
            process.env.EMAIL_FROM ||
            process.env.SMTP_USER,

        to: user.email,

        subject:
            "Password Reset OTP - Task Management System",

        text: `
Hello ${user.name},

We received a request to reset your password.

Your password reset OTP is:

${otp}

This OTP is valid for 10 minutes.

For security reasons, do not share this OTP with anyone.

If you did not request a password reset, please ignore this email.

Regards,
Task Management System
`
    };

    return transporter.sendMail(
        mailOptions
    );
};

const sendEmailVerificationOtpEmail = async (user, otp) => {
    if (!user?.email) {
        throw new Error("User email is missing");
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: "Verify Your Email - Task Management System",
        text: `
Hello ${user.name},

Welcome to Task Management System!

Please verify your email address to activate your account.

Your email verification OTP is:

${otp}

This OTP is valid for 10 minutes.

Without verification, you will not be able to login.

If you did not create this account, please ignore this email.

Regards,
Task Management System
`
    };

    return transporter.sendMail(mailOptions);
};

const sendTaskReminderEmail = async (task, assignedUser, type) => {
  if (!assignedUser?.email) {
    throw new Error("Assigned user's email is missing");
  }

  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-IN")
    : "Not specified";

  // Type ke hisaab se subject aur message
  let subject, heading, message;

  switch (type) {
    case "before-due":
      subject = `⏰ Reminder: "${task.title}" is due tomorrow`;
      heading = "Task Due Tomorrow";
      message = `Your task is due tomorrow. Please complete it on time.`;
      break;

    case "on-due":
      subject = `🔔 Reminder: "${task.title}" is due today`;
      heading = "Task Due Today";
      message = `Your task is due today. Please complete it as soon as possible.`;
      break;

    case "overdue":
      subject = `🚨 Alert: "${task.title}" is overdue`;
      heading = "Task Overdue";
      message = `This task is overdue. Please complete it immediately or contact your admin.`;
      break;

    default:
      subject = `Reminder: "${task.title}"`;
      heading = "Task Reminder";
      message = `This is a reminder for your task.`;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: assignedUser.email,
    subject,
    text: `
Hello ${assignedUser.name},

${heading}

${message}

Task Details:
─────────────
Title       : ${task.title}
Description : ${task.description || "Not specified"}
Priority    : ${task.priority}
Status      : ${task.status}
Due Date    : ${dueDate}
─────────────

Please log in to the Task Management System to view or update this task.

Regards,
Task Management System
`,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendTaskAssignedEmail, sendPasswordResetOtpEmail, sendEmailVerificationOtpEmail, sendTaskReminderEmail,
};