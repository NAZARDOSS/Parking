import express from 'express';
import * as placesController from '../controllers/placesController.js';
import { authenticateToken } from '../middleware/middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/parkings', placesController.getParkings);
router.post('/parking-recommendations', placesController.getParkingRecommendations);
router.post('/parking-occupancy-prediction', placesController.getParkingOccupancyPrediction);
router.get('/ev-chargers', placesController.getEvChargers);

export default router;
