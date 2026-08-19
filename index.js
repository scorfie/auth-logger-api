require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const eventsRouter = require('./src/routes/events');
const adminRouter = require('./src/routes/admin');
const openapiSpec = require('./src/config/openapi');
const scheduleRetentionJob = require('./src/jobs/retentionJob');
const initRealtime = require('./src/realtime/eventsRealtime');

async function main() {
  const { apiReference } = await import('@scalar/express-api-reference');

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/openapi.json', (req, res) => res.json(openapiSpec));
  app.use('/reference', apiReference({ url: '/openapi.json' }));

  app.use('/api', eventsRouter);
  app.use('/api/admin', adminRouter);

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  scheduleRetentionJob();

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  initRealtime(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`AuthLoggerSDK-API listening on port ${PORT}`);
    console.log(`API docs available at http://localhost:${PORT}/reference`);
    console.log(`Realtime updates available over Socket.IO at the same origin`);
  });
}

main();
