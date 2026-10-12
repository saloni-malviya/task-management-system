# Task Management System

A RESTful backend API for managing users and tasks with role-based access control, email notifications, background job processing, and activity logging.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Technologies Used](#-technologies-used)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [How to Run](#-how-to-run)
- [API Documentation](#-api-documentation)
- [Database Information](#-database-information)
- [Project Structure](#-project-structure)
- [Additional Features](#-additional-features)

---

## 📖 Project Overview

A backend system built with **Node.js**, **Express.js**, and **MongoDB** that allows:

- **Users** to register and login, create their own tasks, and track task status
- **Admins** to manage users, assign tasks to any user, and view system-wide statistics
- **Automatic email notifications** whenever a task is assigned to a user
- **Background job processing** for emails using Redis + BullMQ
- **Task reminders** — automated emails before, on, and after the due date
- **Activity logs** to track every important action in the system

The system is built as a REST API with a clean, scalable, and maintainable backend structure following the **MVC + Service Layer** pattern.

---

## ✨ Features

### Core Features

- **User Authentication** — Register, Login, Logout with JWT-based authentication
- **Refresh Token Authentication** — Access token (15 min) + Refresh token (7 days)
- **Password Reset** — OTP-based forgot-password flow
- **Email Verification** — OTP-based email verification before login
- **Role-Based Access Control** — Admin and Normal User with separate permissions
- **Task Management** — Create, read, update, delete tasks with soft delete
- **Task Assignment** — Admins can assign tasks to any registered user
- **Task Search & Filtering** — Search by title, filter by status, priority, assigned user
- **Sorting** — Sort tasks by due date, created date, priority
- **Pagination** — All listing APIs support pagination
- **Admin Dashboard** — System-wide statistics (users, tasks, statuses, priorities)
- **Input Validation** — All requests validated using express-validator
- **Error Handling** — Centralized error handler with meaningful messages

### Bonus / Advanced Features

- **Redis + BullMQ** — Background email processing with retry support
- **Task Reminders** — Delayed jobs send automatic reminders before/on/after due date
- **Activity Logs** — Track every important action with actor, IP, and metadata
- **Soft Delete** — Users and tasks are soft-deleted (restorable by admin)
- **Rate Limiting** — Global, auth, OTP, write, and search-specific rate limits
- **Email Queue** — All emails processed via background workers

---

## 🛠 Technologies Used

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM for MongoDB |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Nodemailer** | Email sending |
| **Redis** | In-memory store for queues |
| **BullMQ** | Background job queue |
| **express-validator** | Request validation |
| **express-rate-limit** | Rate limiting |
| **Helmet** | Security headers |
| **CORS** | Cross-origin support |
| **dotenv** | Environment variables |

---

## ⚙️ Installation

### Prerequisites

Make sure you have the following installed:

- **Node.js** (v18 or higher)
- **MongoDB** (local or MongoDB Atlas)
- **Redis** (local, Memurai for Windows, or cloud)

### Steps

**1. Clone the repository**

```bash
git clone <your-repo-url>
cd task-management-system
```

**2. Install dependencies**

```bash
npm install
```

**3. Setup environment variables**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then fill in your actual values (see [Environment Variables](#-environment-variables)).

**4. Start Redis**

- **Windows**: Start Memurai (or Redis for Windows)
- **Mac/Linux**: `redis-server`
- **Docker**: `docker run -d -p 6379:6379 redis:7-alpine`

**5. Seed the admin user**

```bash
npm run seed:admin
```

This creates a default admin:
- **Email**: `admin@example.com`
- **Password**: `Admin@123`

**6. Start the server**

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## 🔐 Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/taskdb

# JWT
JWT_SECRET=your_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
EMAIL_FROM=your_email@gmail.com
```

### Notes

- **`JWT_SECRET`** — Use a long random string
- **`SMTP_PASS`** — For Gmail, use an **App Password** (not your real password)
- **`REDIS_PASSWORD`** — Leave empty if Redis has no password (default for local)
- **Never commit your `.env` file** — It contains sensitive credentials

---

## 🚀 How to Run

### Development Mode

```bash
npm run dev
```

Uses `nodemon` for auto-restart on file changes.

### Production Mode

```bash
npm start
```

### Seed Admin

```bash
npm run seed:admin
```

### Expected Startup Output

```
Redis connected
MongoDB connected successfully
Server running on port 5000
Email worker is running in background
Reminder worker is running in background
```

---

## 📚 API Documentation

Base URL: `http://localhost:5000/api/v1`

### 🔑 Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login user | ❌ |
| POST | `/auth/logout` | Logout user | ✅ |
| POST | `/auth/refresh` | Refresh access token | ❌ |
| POST | `/auth/forgot-password` | Request password reset OTP | ❌ |
| POST | `/auth/verify-forgot-password-otp` | Verify reset OTP | ❌ |
| POST | `/auth/reset-password` | Reset password with token | ❌ |
| POST | `/auth/resend-verification-otp` | Resend email verification OTP | ❌ |
| POST | `/auth/verify-email` | Verify email with OTP | ❌ |

### 👤 Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get own profile | ✅ |
| PATCH | `/users/profile` | Update own profile | ✅ |
| GET | `/users/my-stats` | Get own task statistics | ✅ |
| GET | `/users` | List all users (Admin) | ✅ Admin |
| GET | `/users/:id` | Get user by ID (Admin) | ✅ Admin |
| PATCH | `/users/:id` | Update user (Admin) | ✅ Admin |
| DELETE | `/users/:id` | Soft delete user (Admin) | ✅ Admin |

### 📝 Tasks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/tasks` | Create task | ✅ |
| GET | `/tasks` | List tasks (with filters, pagination) | ✅ |
| GET | `/tasks/:id` | Get task by ID | ✅ |
| PATCH | `/tasks/:id` | Update task | ✅ |
| DELETE | `/tasks/:id` | Soft delete task | ✅ |

**Query parameters for `GET /tasks`:**

- `page` — Page number (default: 1)
- `limit` — Records per page (default: 10, max: 100)
- `search` — Search by title
- `status` — `pending` / `in-progress` / `completed`
- `priority` — `low` / `medium` / `high`
- `assignedTo` — Filter by assigned user ID
- `sortBy` — `dueDate` / `createdAt` / `priority`
- `order` — `asc` / `desc`

### 🛡️ Admin

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/stats` | Dashboard statistics | ✅ Admin |
| POST | `/admin/tasks/:id/restore` | Restore deleted task | ✅ Admin |
| POST | `/admin/users/:id/restore` | Restore deleted user | ✅ Admin |

### 📊 Activity Logs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/activity-logs` | Get all logs (filters) | ✅ Admin |
| GET | `/activity-logs/me` | Get own activity | ✅ |
| GET | `/activity-logs/entity/:type/:id` | Timeline for task/user | ✅ |

### 🏥 Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |

### Response Format

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate email) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

### Postman Collection

Import the Postman collection (if included) to test all APIs easily.

---

## 🗄 Database Information

**Database**: MongoDB
**ODM**: Mongoose

### Collections

#### `users`

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | User's full name |
| `email` | String | Unique email |
| `password` | String | Hashed password (bcrypt) |
| `role` | String | `user` or `admin` |
| `canCreateTask` | Boolean | Permission for normal users |
| `tokenVersion` | Number | For access token invalidation |
| `refreshTokenVersion` | Number | For refresh token invalidation |
| `isEmailVerified` | Boolean | Email verification flag |
| `otpHash` | String | Hashed OTP |
| `otpPurpose` | String | `password-reset` or `email-verification` |
| `otpExpiresAt` | Date | OTP expiry time |
| `otpSendCount` | Number | OTP send count in window |
| `isDeleted` | Boolean | Soft delete flag |
| `deletedAt` | Date | When deleted |
| `deletedBy` | ObjectId | Who deleted |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

#### `tasks`

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Task title (3-100 chars) |
| `description` | String | Optional (max 2000 chars) |
| `assignedTo` | ObjectId | Reference to User |
| `createdBy` | ObjectId | Reference to User |
| `status` | String | `pending` / `in-progress` / `completed` |
| `priority` | String | `low` / `medium` / `high` |
| `dueDate` | Date | Task deadline |
| `reminderJobIds` | [String] | BullMQ job IDs |
| `isDeleted` | Boolean | Soft delete flag |
| `deletedAt` | Date | When deleted |
| `deletedBy` | ObjectId | Who deleted |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

#### `activitylogs`

| Field | Type | Description |
|-------|------|-------------|
| `actor` | ObjectId | Reference to User |
| `actorRole` | String | `user` / `admin` / `system` |
| `action` | String | Action name (e.g. `USER_LOGGED_IN`) |
| `entityType` | String | `User` / `Task` / `Auth` |
| `entityId` | ObjectId | Entity reference |
| `entityName` | String | Entity display name |
| `metadata` | Object | Extra details |
| `ipAddress` | String | Request IP |
| `status` | String | `success` / `failure` |
| `createdAt` | Date | TTL index — auto-delete after 90 days |

### Indexes

- `users.email` — Unique
- `users.isDeleted` — For filtering
- `tasks.assignedTo`, `tasks.createdBy`, `tasks.isDeleted`
- `activitylogs.actor`, `activitylogs.action`, `activitylogs.entityType`
- `activitylogs.createdAt` — TTL index (auto-delete after 90 days)

### Relationships

- `Task.assignedTo` → `User._id`
- `Task.createdBy` → `User._id`
- `ActivityLog.actor` → `User._id`

---

## 📁 Project Structure

```
src/
├── config/
│   ├── db.js                    # MongoDB connection
│   ├── env.js                   # Environment variables
│   ├── mail.js                  # Nodemailer transporter
│   └── redis.js                 # Redis connection
│
├── controllers/                  # Request handlers
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── task.controller.js
│   └── user.controller.js
│
├── middleware/
│   ├── auth.middleware.js       # JWT verification
│   ├── error.middleware.js      # Centralized error handler
│   ├── notFound.middleware.js   # 404 handler
│   ├── rateLimit.middleware.js  # Rate limiters
│   ├── role.middleware.js       # Role-based access
│   └── validation.middleware.js # Validation handler
│
├── models/
│   ├── ActivityLog.js
│   ├── Task.js
│   └── User.js
│
├── queues/                       # BullMQ queues
│   ├── email.queue.js
│   ├── reminder.queue.js
│   └── workers/
│       ├── email.worker.js
│       └── reminder.worker.js
│
├── routes/                       # API routes
│   ├── activityLog.routes.js
│   ├── admin.routes.js
│   ├── auth.routes.js
│   ├── task.routes.js
│   └── user.routes.js
│
├── seeds/
│   └── admin.seed.js            # Admin seeder
│
├── services/                     # Business logic
│   ├── activityLog.service.js
│   ├── admin.service.js
│   ├── auth.service.js
│   ├── email.service.js
│   ├── reminder.service.js
│   ├── task.service.js
│   └── user.service.js
│
├── utils/
│   ├── AppError.js              # Custom error class
│   ├── asyncHandler.js          # Async wrapper
│   └── response.js              # Response formatter
│
├── validators/                   # Request validators
│   ├── auth.validator.js
│   ├── task.validator.js
│   └── user.validator.js
│
├── app.js                        # Express app setup
└── server.js                     # Server entry point
```

---

## 🎯 Additional Features

### Rate Limiting

The API uses **5 different rate limiters** to prevent abuse:

| Limiter | Window | Max | Applies To |
|---------|--------|-----|------------|
| Global | 15 min | 300 req/IP | All `/api/*` routes |
| Auth | 15 min | 10 attempts | Login, register, reset-password |
| OTP | 10 min | 5 requests | OTP send endpoints |
| Write | 1 min | 30 requests | POST/PATCH/DELETE |
| Search | 1 min | 20 requests | GET with `?search=` |

When rate limit is exceeded, API returns **HTTP 429** with a meaningful message.

### Background Job Processing

Uses **Redis + BullMQ** for background tasks:

- **Email Queue** — All emails (OTP, task assignment) are sent in background
- **Reminder Queue** — Task reminders scheduled as delayed jobs
- **Retry Support** — Failed jobs automatically retried with exponential backoff
- **3 retry attempts** with 2s, 4s, 8s delays

### Task Reminders

Automatic email reminders are scheduled when a task is created:

- **1 day before due date** — "Task due tomorrow"
- **On due date** — "Task due today"
- **1 day after due date** — "Task overdue"

Reminders are automatically **cancelled** if:
- Task is completed
- Task is deleted
- Due date is changed (old ones cancelled, new ones scheduled)

### Activity Logging

Every important action is logged to the `activitylogs` collection:

- User registration, login, logout
- Password reset, email verification
- Task creation, update, status change, deletion
- User role changes, permission changes, deletion

Each log includes:
- **Actor** (who did it)
- **Action** (what was done)
- **Entity** (on what)
- **Metadata** (details like old/new values)
- **IP address** and **timestamp**

Logs are automatically deleted after **90 days** (TTL index).

### Security

- **Password hashing** with bcryptjs (10 salt rounds)
- **JWT-based authentication** with token versioning for session invalidation
- **Refresh token rotation** — logout invalidates all tokens
- **OTP hashing** with SHA-256
- **Helmet** for security headers
- **CORS** enabled
- **Input validation** on all endpoints
- **Rate limiting** on all sensitive routes
- **Sensitive data** (passwords, OTPs) never returned in responses

---

## 📝 License

ISC

---

## 👤 Author

**Your Name**
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [BullMQ](https://docs.bullmq.io/)
- [Redis](https://redis.io/)
- [Nodemailer](https://nodemailer.com/)