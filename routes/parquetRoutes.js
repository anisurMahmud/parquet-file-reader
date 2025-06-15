const express = require('express');
const router = express.Router();
const parquetController = require('../controllers/parquetController');
const auth = require('../middleware/auth')

router.get('/barcode-details',auth ,parquetController.getBarcodeDetails); // Example: http://localhost:3000/api/barcode-details
module.exports = router;

