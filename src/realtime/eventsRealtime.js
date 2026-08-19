const { logsCollectionForApp, serializeEvent } = require("../utils/firestoreEvents");

const REALTIME_LIMIT = 50;

function roomForApp(app) {
  return `app:${app}`;
}

function eventNameForChangeType(type) {
  if (type === "added") return "event:added";
  if (type === "modified") return "event:updated";
  return "event:removed";
}

function initRealtime(io) {
  // appId -> { sockets: Set<socketId>, unsubscribe: Function, warmedUp: boolean }
  const appListeners = new Map();

  function attachListener(app, room) {
    const entry = { sockets: new Set(), warmedUp: false, unsubscribe: null };

    entry.unsubscribe = logsCollectionForApp(app)
      .orderBy("receivedAt", "desc")
      .limit(REALTIME_LIMIT)
      .onSnapshot(
        (snapshot) => {
          // The first callback fires once for the whole current result set;
          // clients already get that via the one-off sync fetch in subscribe(),
          // so only forward changes that happen after the listener warms up.
          if (!entry.warmedUp) {
            entry.warmedUp = true;
            return;
          }
          snapshot.docChanges().forEach((change) => {
            io.to(room).emit(eventNameForChangeType(change.type), {
              app,
              event: serializeEvent(change.doc),
            });
          });
        },
        (err) => {
          console.error(`Realtime listener error for app "${app}":`, err);
          io.to(room).emit("event:error", { app, message: "Realtime listener error" });
        },
      );

    return entry;
  }

  function detach(app, socketId) {
    const entry = appListeners.get(app);
    if (!entry) return;

    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) {
      entry.unsubscribe();
      appListeners.delete(app);
    }
  }

  function subscribe(socket, rawApp) {
    if (typeof rawApp !== "string" || rawApp.trim() === "") {
      socket.emit("event:error", { message: '"app" is required to subscribe' });
      return;
    }

    const app = rawApp.trim();
    const room = roomForApp(app);

    socket.join(room);
    socket.data.apps = socket.data.apps || new Set();
    socket.data.apps.add(app);

    let entry = appListeners.get(app);
    if (!entry) {
      entry = attachListener(app, room);
      appListeners.set(app, entry);
    }
    entry.sockets.add(socket.id);

    logsCollectionForApp(app)
      .orderBy("receivedAt", "desc")
      .limit(REALTIME_LIMIT)
      .get()
      .then((snapshot) => {
        const events = snapshot.docs.map(serializeEvent).reverse();
        socket.emit("event:sync", { app, events });
      })
      .catch((err) => {
        console.error(`Failed to load initial events for app "${app}":`, err);
        socket.emit("event:error", { app, message: "Failed to load initial events" });
      });
  }

  function unsubscribe(socket, rawApp) {
    if (typeof rawApp !== "string" || rawApp.trim() === "") return;

    const app = rawApp.trim();
    socket.leave(roomForApp(app));
    socket.data.apps?.delete(app);
    detach(app, socket.id);
  }

  io.on("connection", (socket) => {
    socket.on("subscribe", ({ app } = {}) => subscribe(socket, app));
    socket.on("unsubscribe", ({ app } = {}) => unsubscribe(socket, app));
    socket.on("disconnect", () => {
      for (const app of socket.data.apps || []) {
        detach(app, socket.id);
      }
    });
  });

  return io;
}

module.exports = initRealtime;
