const express = require("express");

const protect = require("../middleware/auth.middleware");
const {
    getProfile, updateProfile, getAllUsers, getUserById, updateUserById, deleteUserById
} = require("../controllers/user.controller");

const {
    updateProfileValidator, updateUserByAdminValidator
} = require("../validators/user.validator");

const validate = require("../middleware/validation.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const router = express.Router();

router.get(
    "/profile",
    protect,
    getProfile
);
router.patch(
    "/profile",
    protect, updateProfileValidator, validate,
    updateProfile
);
router.get(
    "/",
    protect,
    authorizeRoles("admin"),
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
    updateUserByAdminValidator,
     validate,
    updateUserById
);

router.delete(
    "/:id",
    protect,
    authorizeRoles("admin"),
    deleteUserById
);


module.exports = router;