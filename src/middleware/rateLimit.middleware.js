const rateLimit = require("express-rate-limit");

// ============ HELPER ============
// Standard 429 response format (tumhare sendResponse jaisa)
const rateLimitHandler = (message) => {
  return (req, res) => {
    return res.status(429).json({
      success: false,
      message,
    });
  };
};

// ============ 1. GLOBAL LIMITER ============
// Har IP pe overall cap — poore API pe
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,                 // 300 requests per 15 min per IP
  standardHeaders: true,    // RateLimit-* headers bhejega
  legacyHeaders: false,     // X-RateLimit-* band
  handler: rateLimitHandler(
    "Too many requests from this IP. Please try again after 15 minutes."
  ),
});

// ============ 2. AUTH LIMITER ============
// Login/Register/Forgot-password brute force rokne ke liye
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,                  // 10 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // ✅ Successful login count nahi hoga
  handler: rateLimitHandler(
    "Too many authentication attempts. Please try again after 15 minutes."
  ),
});

// ============ 3. OTP LIMITER ============
// OTP endpoints ke liye — strict
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,                   // 5 OTP requests per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    "Too many OTP requests. Please try again after 10 minutes."
  ),
});

// ============ 4. WRITE LIMITER ============
// POST/PATCH/DELETE tasks/users ke liye
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,             // 30 writes per min
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    "Too many write operations. Please slow down."
  ),
});

// ============ 5. SEARCH LIMITER ============
// GET endpoints pe jo search/query karte hain
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 20,             // 20 search requests per min per IP
  standardHeaders: true,
  legacyHeaders: false,
  // Sirf search query wali requests count karo
  skip: (req) => {
    // Agar search query nahi hai, skip karo (normal listing hai)
    return !req.query.search;
  },
  handler: rateLimitHandler(
    "Too many search requests. Please slow down."
  ),
});

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  writeLimiter,
  searchLimiter
};