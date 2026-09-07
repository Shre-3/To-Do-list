const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({limit: '1mb'}));

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS progress (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at INTEGER
  )`);
});

app.get('/health', (req, res) => res.json({ok: true}));

app.post('/save/:id', (req, res) => {
  const id = req.params.id;
  const data = JSON.stringify(req.body.state || {});
  const now = Date.now();
  const sql = `REPLACE INTO progress (id, data, updated_at) VALUES (?, ?, ?)`;
  db.run(sql, [id, data, now], function(err) {
    if (err) return res.status(500).json({error: 'db_error', detail: err.message});
    res.json({ok: true, id, updated_at: now});
  });
});

app.get('/load/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT data, updated_at FROM progress WHERE id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({error: 'db_error', detail: err.message});
    if (!row) return res.status(404).json({error: 'not_found'});
    try {
      const state = JSON.parse(row.data || '{}');
      res.json({ok: true, state, updated_at: row.updated_at});
    } catch (e) {
      res.status(500).json({error: 'invalid_data'});
    }
  });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
