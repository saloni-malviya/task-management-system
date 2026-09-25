const userService = require("../services/user.service");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.userId);

    return sendResponse(
        res,
        200,
        "Profile fetched successfully",
        user
    );
});

const updateProfile = asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(
        req.user.userId,
        req.body
    );

    return sendResponse(
        res,
        200,
        "Profile updated successfully",
        user
    );
});

const getAllUsers = asyncHandler(async (req, res) => {
  //  const users = await userService.getAllUsers();

  const page = Math.max(
        1,
        parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const result = await userService.getAllUsers(
        page,
        limit
    );
    return sendResponse(
        res,
        200,
        "Users fetched successfully",
        result
    );
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);

    return sendResponse(
        res,
        200,
        "User fetched successfully",
        user
    );
});

const updateUserById = asyncHandler(async (req, res) => {
    const user = await userService.updateUserById(
        req.params.id,
        req.body
    );

    return sendResponse(
        res,
        200,
        "User updated successfully",
        user
    );
});

const deleteUserById = asyncHandler(async (req, res) => {
    await userService.deleteUserById(req.params.id, req.user.userId);

    return sendResponse(
        res,
        200,
        "User deleted successfully"
    );
});

const getMyTaskStats = asyncHandler(async (req, res) => {
    const stats = await userService.getMyTaskStats(
        req.user.userId
    );

    return sendResponse(
        res,
        200,
        "Your Task statistics fetched successfully",
        stats
    );
});


module.exports = {
    getProfile, updateProfile, getAllUsers,
    getUserById,
    updateUserById,
    deleteUserById, getMyTaskStats
};