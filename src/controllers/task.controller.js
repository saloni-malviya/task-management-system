const taskService = require("../services/task.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(
    req.body,
    req.user.userId
  );

  return sendResponse(
    res,
    201,
    "Task created successfully",
    task
  );
});

const getTasks = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await taskService.getTasks(
    req.user.userId,
    req.user.role,
    page,
    limit
  );

  return sendResponse(
    res,
    200,
    "Tasks fetched successfully",
    result
  );
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return sendResponse(
    res,
    200,
    "Task fetched successfully",
    task
  );
});

module.exports = {
  createTask, getTasks, getTaskById
};