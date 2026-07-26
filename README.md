# Fuel Log — petrol consumption tracker (MongoDB-backed)

A small Express app that serves the fuel tracker UI and stores every
fill-up in MongoDB. Deploy it anywhere that runs Node.js.

## 1. Create a free MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new project, then build a database — choose the **M0 Free**
   tier (512 MB, no cost, no expiry).
3. Under **Database Access**, add a database user with a username and
   password (write them down).
4. Under **Network Access**, add an IP entry. For quick setup choose
   "Allow access from anywhere" (0.0.0.0/0) — fine for getting started;
   restrict it later if needed.
5. Go to **Database -> Connect -> Drivers**, choose Node.js, and copy
   the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Replace `<username>` and `<password>` with the credentials from step 3.

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and paste your connection string into `MONGODB_URI`. You can
leave `MONGODB_DB` and `MONGODB_COLLECTION` as-is, or rename them.

## 3. Run locally

```bash
npm install
npm start
```

Visit http://localhost:3000 — the page loads, and every fill-up you add
is written to your MongoDB Atlas cluster. Open the same URL from another
device on your network (or after deploying) and you'll see the same
shared data.

## 4. Deploy it somewhere

Any Node host works. Two free-tier-friendly options:

### Render.com
1. Push this folder to a GitHub repo.
2. On Render, create a new **Web Service** from that repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Add an environment variable `MONGODB_URI` (and optionally
   `MONGODB_DB` / `MONGODB_COLLECTION`) with the same values from your
   `.env` file.
5. Deploy. Render gives you a public URL.

### Railway.app
1. Push to GitHub, then "New Project -> Deploy from GitHub repo" on
   Railway.
2. Add the same environment variables under the service's Variables tab.
3. Railway auto-detects Node and runs `npm start`.

Either way, don't commit your real `.env` file — only `.env.example` is
meant to be checked into git.

## How it's structured

- `server.js` — Express server exposing a small REST API
  (`GET/POST /api/entries`, `DELETE /api/entries/:id`) backed by the
  MongoDB driver, and serving the frontend from `public/`.
- `public/index.html` — the fuel tracker UI (forms, table, charts). It
  talks to the API with `fetch`, so all data lives in MongoDB rather
  than the browser.

## Notes

- Efficiency (km/L) is calculated client-side from consecutive
  odometer readings per vehicle — no extra fields needed in MongoDB.
- The connection string contains your database password — keep `.env`
  out of version control (a `.gitignore` is included) and out of any
  public deployment logs.
