import express from 'express';
import * as reqController from '../controllers/requestsController';
const router = express.Router();
router.post('/routeInfo', reqController.addRequest);
router.get('/getRoutes', reqController.getRequests);
export default router;
