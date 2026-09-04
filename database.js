const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'portfolio.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const addVisitor = db.prepare('INSERT INTO visitors DEFAULT VALUES');
const countVisitors = db.prepare('SELECT COUNT(*) AS count FROM visitors');
const addMessage = db.prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)');

module.exports = {
  addVisitor() {
    addVisitor.run();
    return countVisitors.get().count;
  },
  getVisitorCount() {
    return countVisitors.get().count;
  },
  saveMessage(name, email, message) {
    addMessage.run(name, email, message);
  }
};
