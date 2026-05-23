const dbConnection = require("../config/dbConnection.js");
const { createLogger } = require("../logger");
const { asyncHandler, AppError } = require("../errorMiddleware");

const logger = createLogger('user-controller');

const createUser = asyncHandler(async (req, res) => {
    const { username, email } = req.validatedData.body;

    logger.info({ username, email }, 'Creating new user');

    const [existing] = await dbConnection.query(
        `SELECT id FROM users WHERE email = ?`,
        [email]
    );

    if (existing.length > 0) {
        throw new AppError('Email already registered', 409, 'USER_EXISTS');
    }

    const [result] = await dbConnection.query(
        `INSERT INTO users (username, email, password_hash, created_at, updated_at) 
         VALUES (?, ?, 'dummy_hash_no_auth', NOW(), NOW())`,
        [username, email]
    );

    const userId = result.insertId;

    logger.info({ userId, username, email }, 'User created successfully');

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
            id: userId,
            username,
            email,
            created_at: new Date().toISOString()
        }
    });
});

const getAllUsers = asyncHandler(async (req, res) => {
    console.log("hit")
    const [users] = await dbConnection.query(
        `SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 100`
    );

    res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});

const getUserById = asyncHandler(async (req, res) => {
    console.log(req.params);
    const { userId } = req.params;

    const [users] = await dbConnection.query(
        `SELECT id, username, email, created_at FROM users WHERE id = ?`,
        [userId]
    );

    if (users.length === 0) {
        throw new AppError(`User ${userId} not found`, 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        data: users[0]
    });
});

module.exports = {
    createUser,
    getAllUsers,
    getUserById
};