const bcrypt = require("bcryptjs");

const User = require("../models/User");
const connectDB = require("../config/db");
const env = require("../config/env");

const createAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = "admin@example.com";
        const adminPassword = "Admin@123";

        const existingAdmin = await User.findOne({
            email: adminEmail
        });

        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(
            adminPassword,
            10
        );

        await User.create({
            name: "System Admin",
            email: adminEmail,
            password: hashedPassword,
            role: "admin"
        });

        console.log("Admin created successfully");
        console.log("Email:", adminEmail);
        console.log("Password:", adminPassword);

        process.exit(0);
    } catch (error) {
        console.error("Admin creation failed:", error.message);
        process.exit(1);
    }
};

createAdmin();