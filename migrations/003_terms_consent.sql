-- Which version of /terms the runner accepted, and whether a parent/guardian consented for a runner under 18.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS guardian_consent BOOLEAN NOT NULL DEFAULT false;
