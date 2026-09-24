const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const AppError = require("../utils/AppError");
const env = require("../config/env");

const registerUser = async ({ name, email, password }) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new AppError("Email is already registered", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "user"
        });

        const userObject = user.toObject();

        delete userObject.password;

        return userObject;
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError("Email is already registered", 409);
        }

        throw error;
    }
};

const loginUser = async ({ email, password }) => {
    const user = await User
        .findOne({ email })
        .select("+password");

    if (!user) {
        throw new AppError("Invalid email or password", 401);
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new AppError("Invalid email or password", 401);
    }

    const token = jwt.sign(
        {
            userId: user._id,
            role: user.role,
            tokenVersion: user.tokenVersion,
        },
        env.jwtSecret,
        {
            expiresIn: env.jwtExpiresIn
        }
    );

    const userObject = user.toObject();

    delete userObject.password;

    return {
        user: userObject,
        token
    };
};

const logout = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    user.tokenVersion += 1;

    await user.save();

    return {
        message: "Logout successful",
    };
};

module.exports = {
    registerUser,
    loginUser, logout
};