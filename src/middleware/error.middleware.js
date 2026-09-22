const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Invalid MongoDB ObjectId
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID format";
    }

    // Mongoose schema validation error
    if (err.name === "ValidationError") {
        statusCode = 400;

        message = Object.values(err.errors)
            .map((error) => error.message)
            .join(", ");
    }

    // Duplicate unique field, such as email
    if (err.code === 11000) {
        statusCode = 409;

        const field = Object.keys(err.keyValue || {})[0];

        message = field
            ? `${field} already exists`
            : "Duplicate value";
    }

    console.error(err);

    return res.status(statusCode).json({
        success: false,
        message
    });
};

module.exports = errorHandler;