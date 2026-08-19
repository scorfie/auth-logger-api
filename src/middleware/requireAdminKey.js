function requireAdminKey(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;

  if (!configuredKey) {
    return res.status(503).json({ error: 'Admin API is not configured' });
  }

  if (req.get('x-admin-key') !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = requireAdminKey;
