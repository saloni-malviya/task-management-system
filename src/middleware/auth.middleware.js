const jwt = require("jsonwebtoken");

const User = require("../models/User");
const AppError = require("../utils/AppError");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  //1. Check Header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Authentication token is required", 401);
  }
  //2. Token nikala
  const token = authHeader.split(" ")[1];

  //3. verify
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw new AppError("Invalid or expired token", 401);
  }

   // refresh token ko access token ki jagah use na karne do
    if (decoded.type === "refresh") {
        throw new AppError(
            "Cannot use refresh token as access token",
            401
        );
    }

  //4. find user
  const user = await User.findOne({ _id: decoded.userId, isDeleted: false });

  if (!user) {
    throw new AppError("User associated with this token no longer exists", 401);
  }

  //5. tokenVersion check- Ye logout ka kaam
  if (decoded.tokenVersion !== user.tokenVersion) {
    throw new AppError(
      "Session has been invalidated. Please login again.",
      401,
    );
  }

  //6. req.user set
  req.user = {
    userId: user._id.toString(),
    role: user.role,
  };

  next();
});

module.exports = protect;
