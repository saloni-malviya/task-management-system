const express = require("express");

const protect = require("../middleware/auth.middleware");
const {
    getProfile, updateProfile, getAllUsers, getUserById, updateUserById, deleteUserById, getMyTaskStats
} = require("../controllers/user.controller");

const {
    updateProfileValidator, updateUserByAdminValidator
} = require("../validators/user.validator");

const validate = require("../middleware/validation.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const { writeLimiter, searchLimiter } = require("../middleware/rateLimit.middleware");
const router = express.Router();

router.get(
    "/profile",
    protect,
    getProfile
);
router.patch(
    "/profile",
    protect, writeLimiter, updateProfileValidator, validate,
    updateProfile
);

router.get(
    "/my-stats",
    protect,
    getMyTaskStats
);


router.get(
    "/",
    protect,
    authorizeRoles("admin"),
    searchLimiter,
    getAllUsers
);

router.get(
    "/:id",
    protect,
    authorizeRoles("admin"),
    getUserById
);

router.patch(
    "/:id",
    protect,
    authorizeRoles("admin"),
    writeLimiter,
    updateUserByAdminValidator,
     validate,
    updateUserById
);

router.delete(
    "/:id",
    protect,
    authorizeRoles("admin"),
    writeLimiter,
    deleteUserById
);


module.exports = router;