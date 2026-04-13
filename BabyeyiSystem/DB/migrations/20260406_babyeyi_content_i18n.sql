-- Persisted EN→RW/FR narrative for Babyeyi (also applied via startup ALTER in babyeyi.js).

ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS content_i18n LONGTEXT NULL;
ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS translation_status VARCHAR(32) NULL;
