const { db, admin } = require('../config/firebase');

const BATCH_SIZE = 500;
const EVENTS_COLLECTION = "events";

async function deleteOldEventsInCollection(collectionRef, cutoff) {
  let totalDeleted = 0;

  for (;;) {
    const snapshot = await collectionRef
      .where('receivedAt', '<=', cutoff)
      .limit(BATCH_SIZE)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    totalDeleted += snapshot.size;

    if (snapshot.size < BATCH_SIZE) break;
  }

  return totalDeleted;
}

async function deleteExpiredEvents(retentionDays) {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const appDocs = await db.collection(EVENTS_COLLECTION).listDocuments();

  const deleted = {};
  for (const appDoc of appDocs) {
    const collectionRef = appDoc.collection(EVENTS_COLLECTION);
    deleted[appDoc.id] = await deleteOldEventsInCollection(collectionRef, cutoff);
  }

  return deleted;
}

module.exports = { deleteExpiredEvents };
