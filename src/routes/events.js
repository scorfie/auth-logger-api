const express = require('express');
const validateEvent = require('../middleware/validateEvent');
const { createEvent, listEvents, getEvent } = require('../controllers/eventsController');

const router = express.Router();

router.post('/events', validateEvent, createEvent);
router.get('/events/:app', listEvents);
router.get('/events/:app/:id', getEvent);

module.exports = router;
