# Thonglor Charity Run 2026: registration platform

Registration, payment and race-pack check-in for the Thonglor Charity Run (Sunday 15 November 2026, 06:00).
Runners pick a race pack, fill in the entry form in Thai or English, pay, and get an e-ticket with a bib number.
Organizers use `/admin` to see entries, confirm transfers, hand out race packs and export to CSV.

| Pack | Price | Includes | Bib numbers |
|---|---|---|---|
| 5K | 600 THB | shirt, medal, post-run meal | 50001, 50002, … |
| 10K | 800 THB | shirt, medal, post-run meal | 10001, 10002, … |
| VIP (5K or 10K) | 1,200 THB | shirt, medal, headband, post-run meal | V001, V002, … |

## How it works

- **Capacity**: 3,000 spots. An unpaid entry holds a spot for 24 hours, then expires and the spot is released.
  Sign-ups are serialised in the database, so the site never sells more than the cap, even under load.
- **One entry per person**: the Thai ID (checksum validated) or passport number can only have one live entry.
- **Payments** (pick one):
  - **Omise (recommended)**: PromptPay QR and credit/debit cards. Payments confirm themselves through Omise's webhook, and
    the bib is issued and emailed straight away. The server always re-checks the charge with Omise before trusting it.
  - **Manual PromptPay**: if Omise keys are not set but `PROMPTPAY_ID` is, runners scan a PromptPay QR for the exact amount,
    press "I've transferred", and an organizer confirms the payment in `/admin`.
- **Runner access**: there are no runner accounts. Each entry has a private link (emailed, and remembered on the device
  under "My entries"). Runners can ask for their links to be emailed again.
- **Organizer desk** (`/admin`): shared password, each staff member types their name so every action is logged.
  Scan the e-ticket QR (or type a ref/bib) at race-pack pickup to find the runner and mark the pack collected.
  Includes shirt-size totals per pack for ordering, and CSV export.

## Run it locally

Needs Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env          # then set ADMIN_PASSWORD and SESSION_SECRET at least
npm install
npm start                     # creates the tables on first start; open http://localhost:3000
```

Or with Docker: `cp .env.example .env`, edit it, then `docker compose up -d`.

Tests (need a Postgres database you can wipe, default `postgres://tgr:tgr@localhost:5432/tgr_test`):

```bash
npm test
```

## Deploy

### Option A: Render (simplest)
1. Push this folder to a GitHub repository.
2. In Render: **New + → Blueprint**, pick the repository. `render.yaml` creates the web service and a Postgres database in Singapore.
3. Fill in `BASE_URL` (your site address), `ADMIN_PASSWORD`, the Omise keys or `PROMPTPAY_ID`, and `SMTP_URL`.
4. Point your domain at the Render service (Settings → Custom domains).

### Option B: any server with Docker
Copy the folder, create `.env`, run `docker compose up -d`, and put it behind HTTPS (e.g. Caddy or Nginx).
Back up the `pgdata` volume (`docker compose exec db pg_dump -U tgr tgr > backup.sql`).

### Omise setup
1. Create an account at https://dashboard.omise.co and enable **PromptPay** (and cards).
2. Copy the public and secret keys into `OMISE_PUBLIC_KEY` / `OMISE_SECRET_KEY` (start with the `test` keys).
3. In the Omise dashboard → **Webhooks**, add `https://YOUR-DOMAIN/api/webhooks/omise`.
4. Test with Omise test keys: test PromptPay charges can be marked paid from the Omise dashboard; test card `4242 4242 4242 4242`.

### Email
Set `SMTP_URL` (any SMTP service: Gmail/Google Workspace app password, Amazon SES, Mailgun, SendGrid…).
Without it the site still works, but runners only get their links on screen and no emails are sent.

## Environment variables
See `.env.example`. `BASE_URL` must be the real public `https://` address in production (it is used in emails and payment redirects
and turns on secure cookies).

## API overview
Public: `GET /api/config`, `GET /api/stats`, `POST /api/registrations`, `GET /api/registrations/:ref?t=`,
`POST /api/registrations/:ref/pay`, `GET /api/registrations/:ref/promptpay-qr?t=`, `POST /api/registrations/:ref/claim-transfer`,
`POST /api/resend-link`, `POST /api/webhooks/omise`.
Organizer (cookie session): `POST /api/admin/login`, `GET /api/admin/summary`, `GET /api/admin/registrations`,
`GET /api/admin/registrations/:ref`, `POST /api/admin/registrations/:ref/{confirm-payment|cancel|restore|pickup|resend}`,
`GET /api/admin/export.csv`.

## Before launch
- Confirm the start/finish venue: the deck lists อุทยานเบญจสิริ as start and สวนเบญจสิริ as a 10K checkpoint (see `public/js/site.js`, `ROUTES`).
- Pick the shirt design (deck Option 1 or 2) and check the size chart in `public/index.html`.
- Add a privacy notice / refund policy page if the organizer has one (PDPA consent text is in the form).
