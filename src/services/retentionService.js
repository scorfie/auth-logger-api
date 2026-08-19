const { db, admin } = require('../config/firebase');

const BATCH_SIZE = 500;

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
  const collections = await db.listCollections();

  const deleted = {};
  for (const collectionRef of collections) {
    deleted[collectionRef.id] = await deleteOldEventsInCollection(collectionRef, cutoff);
  }

  return deleted;
}

module.exports = { deleteExpiredEvents };
