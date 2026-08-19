const { PLATFORMS, SEVERITIES } = require('../constants');

function validateEvent(req, res, next) {
  const body = req.body || {};
  const errors = [];

  const requiredStrings = ['platform', 'app', 'appVersion', 'message'];
  for (const field of requiredStrings) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      errors.push(`"${field}" is required and must be a non-empty string`);
    }
  }

  if (body.platform && !PLATFORMS.includes(body.platform)) {
    errors.push(`"platform" must be one of: ${PLATFORMS.join(', ')}`);
  }

  if (typeof body.app === 'string') {
    const app = body.app.trim();
    if (app === '.' || app === '..' || /^__.*__$/.test(app)) {
      errors.push('"app" is not a valid document name');
    } else if (app.length > 200) {
      errors.push('"app" must be 200 characters or fewer');
    }
  }

  if (body.severity && !SEVERITIES.includes(body.severity)) {
    errors.push(`"severity" must be one of: ${SEVERITIES.join(', ')}`);
  }

  if (body.timestamp && Number.isNaN(Date.parse(body.timestamp))) {
    errors.push('"timestamp" must be a valid ISO 8601 date string');
  }

  if (body.metadata !== undefined && (typeof body.metadata !== 'object' || Array.isArray(body.metadata) || body.metadata === null)) {
    errors.push('"metadata" must be an object');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Invalid event payload', details: errors });
  }

  next();
}

module.exports = validateEvent;
