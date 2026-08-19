const cron = require('node-cron');
const { deleteExpiredEvents } = require('../services/retentionService');
const resolveRetentionDays = require('../utils/resolveRetentionDays');

function scheduleRetentionJob() {
  if (process.env.RETENTION_ENABLED === 'false') {
    console.log('Retention job disabled (RETENTION_ENABLED=false)');
    return;
  }

  const schedule = process.env.RETENTION_CRON || '0 3 * * *';
  const retentionDays = resolveRetentionDays();

  cron.schedule(schedule, async () => {
    try {
      const deleted = await deleteExpiredEvents(retentionDays);
      console.log('Retention cleanup completed:', deleted);
    } catch (err) {
      console.error('Retention cleanup failed:', err);
    }
  });

  console.log(`Retention job scheduled: "${schedule}" (retention: ${retentionDays} days)`);
}

module.exports = scheduleRetentionJob;
