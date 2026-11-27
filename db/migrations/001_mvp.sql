-- MVP migration (run once against the `fixflow` database).
-- The rest of the schema was created in the previous assignment and is unchanged.

BEGIN;

-- Time-limited, single-use password recovery links (FR: بازیابی رمز عبور).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash  text PRIMARY KEY,
    user_id     bigint NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    expires_at  timestamp with time zone NOT NULL,
    used_at     timestamp with time zone,
    created_at  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens (user_id);

-- A fixed-price proposal needs an estimated delivery time, while an hourly
-- proposal needs an estimated number of hours (both already existed as one
-- numeric column). This column keeps the two values distinct.
ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS estimated_days integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'proposals_estimated_days_check'
    ) THEN
        ALTER TABLE proposals
            ADD CONSTRAINT proposals_estimated_days_check
            CHECK (estimated_days IS NULL OR estimated_days > 0);
    END IF;
END $$;

COMMIT;
