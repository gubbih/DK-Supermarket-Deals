const express = require('express');
const router = express.Router();
const CatalogController = require('../controllers/catalogController');

const catalogController = new CatalogController();

router.get('/catalogs', (req, res) => catalogController.getCatalogIds(req, res));

module.exports = router;