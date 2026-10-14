-- When the runner's gate tag was last printed, so staff can print only new ones.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS tag_printed_at TIMESTAMPTZ;
