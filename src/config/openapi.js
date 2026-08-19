module.exports = {
  openapi: '3.1.0',
  info: {
    title: 'AuthLoggerSDK API',
    version: '1.0.0',
    description: 'API for logging mobile app events (errors, warnings, and info events) from the AuthLoggerSDK to Firebase Firestore.',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/events': {
      post: {
        summary: 'Save a mobile app event',
        description: 'Validates and persists a mobile app event to Firestore. Events are stored under the "logs" collection, in a document named after the "app" field (e.g. "AuthCortex"), inside a "logs" subcollection.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EventInput' },
              example: {
                platform: 'ios',
                app: 'AuthCortex',
                appVersion: '1.2.5',
                osVersion: '19.0',
                device: 'iPhone17,1',
                severity: 'error',
                message: 'Failed to authenticate',
                errorCode: 'AUTH_001',
                endpoint: '/api/authenticate',
                timestamp: '2026-08-19T08:30:00Z',
                metadata: { retryCount: 2, network: 'wifi' },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Event saved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { id: { type: 'string', description: 'Firestore document ID' } },
                },
                example: { id: 'aB3dEfGh1jKlMnOpQrSt' },
              },
            },
          },
          400: {
            description: 'Invalid event payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          500: {
            description: 'Server error while saving the event',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { error: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    '/apps': {
      get: {
        summary: 'List apps',
        description: 'Returns the app IDs (document names under the "events" collection) that have logged at least one event.',
        responses: {
          200: {
            description: 'List of apps',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    apps: { type: 'array', items: { type: 'string' } },
                    count: { type: 'integer' },
                  },
                },
                example: { apps: ['AuthCortex', 'ExampleApp'], count: 2 },
              },
            },
          },
          500: {
            description: 'Server error while listing apps',
            content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
          },
        },
      },
    },
    '/events/{app}': {
      get: {
        summary: 'List events for an app',
        description: 'Returns events from the "logs" subcollection under the "logs/{app}" document, newest first.',
        parameters: [
          { name: 'app', in: 'path', required: true, schema: { type: 'string' }, example: 'AuthCortex' },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['debug', 'info', 'warning', 'error', 'critical'] } },
          { name: 'limit', in: 'query', description: 'Max results (default 50, max 500)', schema: { type: 'integer' } },
          { name: 'startAfter', in: 'query', description: 'Document ID to paginate after', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events: { type: 'array', items: { $ref: '#/components/schemas/EventOutput' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid query parameters',
            content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
          },
        },
      },
    },
    '/events/{app}/{id}': {
      get: {
        summary: 'Get a single event by ID',
        parameters: [
          { name: 'app', in: 'path', required: true, schema: { type: 'string' }, example: 'AuthCortex' },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'The event',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/EventOutput' } } },
          },
          404: {
            description: 'Event not found',
            content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
          },
        },
      },
    },
    '/admin/retention/run': {
      post: {
        summary: 'Manually trigger deletion of expired events',
        description: 'Deletes events older than the retention window across all app documents in the "logs" collection. Requires the "x-admin-key" header to match ADMIN_API_KEY.',
        parameters: [
          { name: 'days', in: 'query', description: 'Override the retention window in days', schema: { type: 'integer' } },
          { name: 'x-admin-key', in: 'header', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Cleanup completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    retentionDays: { type: 'integer' },
                    deleted: { type: 'object', additionalProperties: { type: 'integer' }, description: 'Documents deleted per app (logs/{app}/logs)' },
                  },
                },
                example: { retentionDays: 30, deleted: { AuthCortex: 42 } },
              },
            },
          },
          401: { description: 'Missing or invalid x-admin-key header' },
          503: { description: 'ADMIN_API_KEY is not configured on the server' },
        },
      },
    },
  },
  components: {
    schemas: {
      EventInput: {
        type: 'object',
        required: ['platform', 'app', 'appVersion', 'message'],
        properties: {
          platform: { type: 'string', enum: ['ios', 'android'], description: 'Mobile platform' },
          app: { type: 'string', description: 'App name; used as the document ID under the "logs" collection (logs/{app}/logs/{eventId})' },
          appVersion: { type: 'string', description: 'App version' },
          osVersion: { type: 'string', nullable: true, description: 'Device OS version' },
          device: { type: 'string', nullable: true, description: 'Device model identifier' },
          severity: {
            type: 'string',
            enum: ['debug', 'info', 'warning', 'error', 'critical'],
            default: 'info',
          },
          message: { type: 'string', description: 'Event message' },
          errorCode: { type: 'string', nullable: true, description: 'App-defined error code' },
          endpoint: { type: 'string', nullable: true, description: 'API endpoint related to the event' },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp of the event' },
          metadata: { type: 'object', description: 'Arbitrary additional event metadata', additionalProperties: true },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } },
        },
      },
      EventOutput: {
        allOf: [
          { $ref: '#/components/schemas/EventInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Firestore document ID' },
              receivedAt: { type: 'string', format: 'date-time', description: 'When the server received the event' },
            },
          },
        ],
      },
    },
  },
};
