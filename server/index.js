// Entry point delegating to server.js
const { app, startServer } = require("./server");

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
