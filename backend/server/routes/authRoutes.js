const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signin', authController.register);
router.post('/login', authController.login);

module.exports = router;
