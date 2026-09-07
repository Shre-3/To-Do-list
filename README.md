# Technical Round To-Do (static site)

Open the site in your browser to track progress. Progress is saved in `localStorage`.

Files:

- [site/index.html](site/index.html)
- [site/app.js](site/app.js)
- [site/styles.css](site/styles.css)

Usage:

1. Open [site/index.html](site/index.html) in your browser.
2. Check boxes to mark subtopics done; progress is stored automatically.
3. Use Export to move progress between machines.
4. To enable cross-device persistence, run the small server. The client now auto-saves to the server SQLite DB (best-effort) under a default ID.

Run server:

```bash
cd server
npm install
npm start
```

Notes: the client will attempt to load a server copy on page load and will silently POST updates as you check items. For production you should add authentication and use a proper user identifier instead of the default key.

Next steps (optional):

- Add server-side persistence (simple Flask/Express API + DB).
- Add user accounts and syncing.
