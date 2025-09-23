import express from 'express';
import { createUser, getUsers } from '../controllers/userController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', authMiddleware, createUser);
router.get('/', authMiddleware, getUsers);

export default router;
