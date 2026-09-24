const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const getProfile = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return user;
};
const updateProfile = async (userId, data) => {
    const allowedFields = ["name", "currentPassword", "newPassword"];

    const invalidFields = Object.keys(data).filter(
        (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
        throw new AppError(
            `Fields not allowed: ${invalidFields.join(", ")}`,
            400
        );
    }

    const hasName = data.name !== undefined;
    const hasNewPassword = data.newPassword !== undefined;

    if (!hasName && !hasNewPassword) {
        throw new AppError(
            "Please provide name or newPassword to update",
            400
        );
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (hasName) {
        user.name = data.name;
    }

    if (hasNewPassword) {
        if (!data.currentPassword) {
            throw new AppError(
                "Current password is required",
                400
            );
        }

        const isCurrentPasswordCorrect = await bcrypt.compare(
            data.currentPassword,
            user.password
        );

        if (!isCurrentPasswordCorrect) {
            throw new AppError(
                "Current password is incorrect",
                401
            );
        }

        user.password = await bcrypt.hash(data.newPassword, 10);
    }

    await user.save();

    const userObject = user.toObject();
    delete userObject.password;

    return userObject;
};


const getAllUsers = async (page=1, limit=10) => {
   // const users = await User.find();
   const skip = (page-1) * limit;
    const result = await User.aggregate([
  {
    $lookup: {
      from: "tasks",
      let: { userId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$assignedTo", "$$userId"]
            }
          }
        },
        {
          $count: "total"
        }
      ],
      as: "taskStats"
    }
  },
  {
    $addFields: {
      taskCount: {
        $ifNull: [
          { $arrayElemAt: ["$taskStats.total", 0] },
          0
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      email: 1,
      role: 1,
      createdAt: 1,
      taskCount: 1
    }
  },
  {
    $sort: {
      createdAt: -1
    }
  }, 
  {
            $facet: {
                users: [
                    { $skip: skip },
                    { $limit: limit }
                ],
                totalCount: [
                    { $count: "total" }
                ]
            }
        }
]);
const users = result[0]?.users || [];

    const totalUsers =
        result[0]?.totalCount[0]?.total || 0;

    return {
        users,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            limit
        }
    };

  //  return users;
};


const getUserById = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return user;
};
const updateUserById = async (userId, data) => {
const allowedFields = ["name", "role", "canCreateTask"];

    const invalidFields = Object.keys(data).filter(
        (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
        throw new AppError(
            `Fields not allowed: ${invalidFields.join(", ")}`,
            400
        );
    }

    if (Object.keys(data).length === 0) {
        throw new AppError(
            "Please provide at least one field to update",
            400
        );
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (data.name !== undefined) {
        user.name = data.name;
    }

    if (data.role !== undefined) {
        user.role = data.role;
    }

    if (data.canCreateTask !== undefined) {
        user.canCreateTask = data.canCreateTask;
    }

    await user.save();

    return user;
};
const deleteUserById = async (userId, requesterId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (userId === requesterId) {
        throw new AppError(
            "You cannot delete your own account through this API",
            403
        );
    }

    if (user.role === "admin") {
        const adminCount = await User.countDocuments({
            role: "admin"
        });

        if (adminCount <= 1) {
            throw new AppError(
                "Cannot delete the last admin",
                403
            );
        }
    }

    await User.findByIdAndDelete(userId);
};

module.exports = {
    getProfile, updateProfile, getAllUsers, getUserById, updateUserById, deleteUserById
};