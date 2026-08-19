const { db, admin } = require("../config/firebase");
const { SEVERITIES } = require("../constants");
const { EVENTS_COLLECTION, logsCollectionForApp, serializeEvent } = require("../utils/firestoreEvents");

const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;

async function createEvent(req, res) {
  try {
    const {
      platform,
      app,
      appVersion,
      osVersion,
      device,
      severity,
      message,
      errorCode,
      endpoint,
      timestamp,
      metadata,
    } = req.body;

    const event = {
      platform,
      app,
      appVersion,
      osVersion: osVersion ?? null,
      device: device ?? null,
      severity: severity ?? "info",
      message,
      errorCode: errorCode ?? null,
      endpoint: endpoint ?? null,
      timestamp: timestamp
        ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
        : null,
      metadata: metadata ?? {},
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await logsCollectionForApp(app).add(event);

    res.status(201).json({ id: docRef.id });
  } catch (err) {
    console.error("Failed to save event:", err);
    res.status(500).json({ error: "Failed to save event" });
  }
}

async function listEvents(req, res) {
  try {
    const { app } = req.params;
    const { severity, limit, startAfter } = req.query;

    if (severity && !SEVERITIES.includes(severity)) {
      return res
        .status(400)
        .json({ error: `"severity" must be one of: ${SEVERITIES.join(", ")}` });
    }

    const pageSize = Math.min(
      Number(limit) || DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const collectionRef = logsCollectionForApp(app);

    let query = collectionRef.orderBy("receivedAt", "desc");
    if (severity) query = query.where("severity", "==", severity);
    if (startAfter) {
      const cursorDoc = await collectionRef.doc(startAfter).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }
    query = query.limit(pageSize);

    const snapshot = await query.get();
    const events = snapshot.docs.map(serializeEvent);

    res.json({ events, count: events.length });
  } catch (err) {
    console.error("Failed to list events:", err);
    res.status(500).json({ error: "Failed to list events" });
  }
}

async function listApps(req, res) {
  try {
    const appDocs = await db.collection(EVENTS_COLLECTION).listDocuments();
    const apps = appDocs.map((doc) => doc.id);

    res.json({ apps, count: apps.length });
  } catch (err) {
    console.error("Failed to list apps:", err);
    res.status(500).json({ error: "Failed to list apps" });
  }
}

async function getEvent(req, res) {
  try {
    const { app, id } = req.params;
    const doc = await logsCollectionForApp(app).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(serializeEvent(doc));
  } catch (err) {
    console.error("Failed to get event:", err);
    res.status(500).json({ error: "Failed to get event" });
  }
}

module.exports = { createEvent, listEvents, getEvent, listApps };
