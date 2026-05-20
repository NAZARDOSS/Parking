# Parking MVP

Navigation web application for finding parking places, EV chargers and saving user route history.

## Stack

- Frontend: React, Vite, Redux Toolkit, Tailwind CSS, Mapbox GL
- Backend: Express, MySQL, JWT auth, Google OAuth
- External providers: Mapbox, Overpass API, Open Charge Map

## Quick Start

1. Install dependencies:

```bash
npm run install:all
```

2. Create environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Fill required values:

- `backend/.env`: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`
- `frontend/.env`: `VITE_MAPBOX_ACCESS_TOKEN`
- Required for EV chargers: `OPEN_CHARGE_MAP_API_KEY`
- Optional OAuth values: `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`
- Optional free password-reset email values: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

4. Initialize database:

```bash
mysql -u root -p < backend/server/config/schema.sql
```

5. Run backend and frontend in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Backend health check: `http://localhost:5005/api/health`

## Existing Database Migration

Route history is now private per user. If you already have the old `requests` table, run:

```bash
mysql -u root -p < backend/server/config/migration-user-routes.sql
```

Password reset needs two new columns on `users`. If your database already exists, run:

```bash
mysql -u root -p < backend/server/config/migration-password-reset.sql
```

## Google Login

Google login and Google registration use the same backend endpoint. Create an OAuth Web Client in Google Cloud Console and set:

- `backend/.env`: `GOOGLE_CLIENT_ID=...`
- `frontend/.env`: `VITE_GOOGLE_CLIENT_ID=...`

For local development, add `http://localhost:3000` to the allowed JavaScript origins.

## Parking And EV Providers

Parking data is loaded from OpenStreetMap through Overpass API and does not need an API key.

EV chargers are loaded from Open Charge Map. Create a free Open Charge Map API key and set:

```bash
OPEN_CHARGE_MAP_API_KEY=your_free_key
```

The map filter panel now supports a broad local filter set:

- Parking: access, fee/payment, parking type, street parking, accessibility, opening hours, capacity, height, lighting, supervision, surveillance and charging-space metadata from OSM tags.
- EV chargers: status, usage/access, payment, level, AC/DC, connector families, minimum power, minimum points, operator/search, verification, comments, media and check-ins.

The EV proxy also accepts Open Charge Map exact-match query filters when needed: `chargepointid`, `countryid`, `countrycode`, `postalcode`, `operatorid`, `connectiontypeid`, `levelid`, `usagetypeid`, `statustypeid`, `dataproviderid`, `submissionstatustypeid` and `title`.

## Forgot Password

This is free. No paid email service is required.

- For local development, leave SMTP fields empty. The `/api/auth/forgot-password` response includes `devResetUrl`, and the UI shows a reset link.
- For real email delivery, use any SMTP mailbox you already have, for example Gmail with an app password, and fill the SMTP fields in `backend/.env`.

## Security Notes

- Real secrets are loaded from `.env` and ignored by git.
- `requests` and external provider proxy routes require JWT auth.
- Registration returns a JWT and stores only bcrypt password hashes.
- Password reset tokens are stored only as SHA-256 hashes and expire automatically.
- Login errors are intentionally generic.
- Backend uses Helmet, CORS allow-listing, JSON body limits and auth rate limiting.

## Checks

```bash
npm run test
npm run build
npm run audit
```
