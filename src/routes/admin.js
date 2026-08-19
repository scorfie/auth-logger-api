const express = require('express');
const requireAdminKey = require('../middleware/requireAdminKey');
const { deleteExpiredEvents } = require('../services/retentionService');
const resolveRetentionDays = require('../utils/resolveRetentionDays');

const router = express.Router();

router.post('/retention/run', requireAdminKey, async (req, res) => {
  try {
    const retentionDays = resolveRetentionDays(req.query.days);
    const deleted = await deleteExpiredEvents(retentionDays);
    res.json({ retentionDays, deleted });
  } catch (err) {
    console.error('Manual retention run failed:', err);
    res.status(500).json({ error: 'Retention run failed' });
  }
});

module.exports = router;
