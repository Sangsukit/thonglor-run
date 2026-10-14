CREATE TABLE IF NOT EXISTS registrations (
  id               BIGSERIAL PRIMARY KEY,
  ref              TEXT NOT NULL UNIQUE,
  access_token     TEXT NOT NULL,
  pack             TEXT NOT NULL CHECK (pack IN ('5K','10K','VIP')),
  distance         TEXT NOT NULL CHECK (distance IN ('5K','10K')),
  price_thb        INTEGER NOT NULL CHECK (price_thb > 0),

  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  bib_name         TEXT NOT NULL,
  gender           TEXT NOT NULL CHECK (gender IN ('M','F','X')),
  date_of_birth    DATE NOT NULL,
  nationality      TEXT NOT NULL,
  id_number        TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT NOT NULL,
  emergency_name   TEXT NOT NULL,
  emergency_phone  TEXT NOT NULL,
  medical          TEXT NOT NULL DEFAULT '',
  shirt_size       TEXT NOT NULL,

  status           TEXT NOT NULL DEFAULT 'awaiting_payment'
                   CHECK (status IN ('awaiting_payment','verifying','paid','cancelled','expired')),
  bib_no           INTEGER,
  bib              TEXT UNIQUE,
  payment_method   TEXT,
  payment_note     TEXT,
  omise_charge_id  TEXT UNIQUE,
  paid_at          TIMESTAMPTZ,
  picked_up_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  consent_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One bib number per pack.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_pack_bib ON registrations (pack, bib_no) WHERE bib_no IS NOT NULL;
-- One live entry per ID/passport number.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_active_id ON registrations (upper(id_number))
  WHERE status IN ('awaiting_payment','verifying','paid');
CREATE INDEX IF NOT EXISTS registrations_status ON registrations (status);
CREATE INDEX IF NOT EXISTS registrations_email ON registrations (lower(email));

CREATE TABLE IF NOT EXISTS audit_log (
  id               BIGSERIAL PRIMARY KEY,
  registration_id  BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,
  actor            TEXT NOT NULL,
  detail           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_reg ON audit_log (registration_id);
