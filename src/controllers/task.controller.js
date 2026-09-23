const taskService = require("../services/task.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { updateTaskValidator } = require("../validators/task.validator");

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
  //const page = Number(req.query.page) || 1;
  //const limit = Number(req.query.limit) || 10;
   const page = Math.max(
    1,
    parseInt(req.query.page, 10) || 1
  );

  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit, 10) || 10)
  );

  const result = await taskService.getTasks(
    req.user.userId,
    req.user.role,
    page,
    limit,
    req.query
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

const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(
    req.params.id,
    req.body,
    req.user.userId,
    req.user.role
  );

  return sendResponse(
    res,
    200,
    "Task updated successfully",
    task
  );
});


const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(
    req.params.id,
    req.user.role
  );

  return sendResponse(
    res,
    200,
    "Task deleted successfully",
    null
  );
});

module.exports = {
  createTask, getTasks, getTaskById, updateTask, deleteTask
};