const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const Task = require("../models/Task");

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


const getAllUsers = async (page=1, limit=10, query = {}) => {
   // const users = await User.find();
   const { search } = query;

   const skip = (page-1) * limit;

   //pipeline build
   const pipeline = [];
    
   //Tasks ke sath join (taskcount nikalne k liye)
   pipeline.push({
    $lookup: {
      from: "tasks",
      let: { userId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$assignedTo", "$$userId"]
            },
          },
        },
        {
          $count: "total",
        },
      ],
      as: "taskStats",
    },
  });

  //taskcount field add krna
  pipeline.push({
    $addFields: {
      taskCount: {
        $ifNull: [
          { $arrayElemAt: ["$taskStats.total", 0] },
          0,
        ],
      },
    },
  });

  //search filter
  if(search && search.trim()) {
    const searchLower = search.trim().toLowerCase();

    //search condition
    const stringSearchConditions = [
        {
            name: {
                $regex: search.trim(),
                $options: "i",
            },
        },
        {
            email: {
                $regex: search.trim(),
                $options: "i",

            },
        },
        {
            role: {
                $regex: search.trim(),
                $options: "i",

            },
        },
    ];

    //agr search number hai, taskcount se match kro
    if(!isNaN(searchLower)) {
        stringSearchConditions.push({
            $expr: {
                $regexMatch: {
                    input: { $toString: "$taskCount" },
                    regex: search.trim(),
                },
            },

        });
    }
  pipeline.push({
    $match: {
        $or: stringSearchConditions,
    },
  });
}

pipeline.push({
    $project: {
      name: 1,
      email: 1,
      role: 1,
      createdAt: 1,
      taskCount: 1
    }
  });

  pipeline.push({
    $sort: {
      createdAt: -1
    }
  }); 

  //pagination + total count ek sath
  pipeline.push({
            $facet: {
                users: [
                    { $skip: skip },
                    { $limit: limit },
                ],
                totalCount: [
                    { $count: "total" },
                ],
            },
        });

        const result = await User.aggregate(pipeline);
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

const getMyTaskStats = async (userId) => {
    // User ke tasks ka filter:
    // - Jo usne banaye (createdBy)
    // - Ya jo usko assign hue (assignedTo)
    const userFilter = {
        $or: [
            { createdBy: userId },
            { assignedTo: userId },
        ],
    };

    const [
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        highPriorityTasks,
    ] = await Promise.all([
        Task.countDocuments(userFilter),

        Task.countDocuments({
            $and: [userFilter, { status: "pending" }],
        }),

        Task.countDocuments({
            $and: [userFilter, { status: "in-progress" }],
        }),

        Task.countDocuments({
            $and: [userFilter, { status: "completed" }],
        }),

        Task.countDocuments({
            $and: [userFilter, { priority: "high" }],
        }),
    ]);

    return {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        highPriorityTasks,
    };
};
module.exports = {
    getProfile, updateProfile, getAllUsers, getUserById, updateUserById, deleteUserById, getMyTaskStats};