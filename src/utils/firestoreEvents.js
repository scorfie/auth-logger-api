const { db } = require("../config/firebase");

const EVENTS_COLLECTION = "events";

function appDocId(app) {
  return app.trim().replace(/\//g, "-");
}

function logsCollectionForApp(app) {
  return db
    .collection(EVENTS_COLLECTION)
    .doc(appDocId(app))
    .collection(EVENTS_COLLECTION);
}

function serializeEvent(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
    receivedAt: data.receivedAt ? data.receivedAt.toDate().toISOString() : null,
  };
}

module.exports = { EVENTS_COLLECTION, appDocId, logsCollectionForApp, serializeEvent };
