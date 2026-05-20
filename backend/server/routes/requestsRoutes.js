import express from 'express';
import * as reqController from '../controllers/requestsController.js';
import { authenticateToken } from '../middleware/middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.post('/routeInfo', reqController.addRequest);
router.get('/getRoutes', reqController.getRequests);

export default router;
