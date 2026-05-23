/**
 * ✅ COMPLETE USER MANAGEMENT ROUTES
 * 
 * ===== API WORKFLOW =====
 * PHASE 1: User Management (Foundation - No dependencies)
 * 
 * 1. POST  /api/user/create        → Create new user
 * 2. GET   /api/user/list          → Get all users
 * 3. GET   /api/user/:userId       → Get specific user
 * 
 * After creating user, proceed to:
 * PHASE 2: Campaign Management (requires user_id)
 */

const express = require("express");
const userController = require("../controller/userController.js");
const { validateRequest, createUserSchema } = require("../validationMiddleware");
const router = express.Router();

// ✅ PHASE 1: User Management APIs

// ✅ API 1: Create User (PHASE 1)
// POST /api/user/create
// Requires: username, email
// Returns: user_id (use this in PHASE 2)
router.post(
    '/create',
    validateRequest(createUserSchema),
    userController.createUser
);

// ✅ API 2: Get All Users (PHASE 1)
// GET /api/user/list
// Returns: Array of all users
router.get('/list', userController.getAllUsers);

// ✅ API 3: Get User By ID (PHASE 1)
// GET /api/user/:userId
// Returns: Specific user details
router.get('/:userId', userController.getUserById);

module.exports = router;
