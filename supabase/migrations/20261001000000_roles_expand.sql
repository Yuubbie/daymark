-- =============================================================================
-- Daymark — extend the role set
-- Adds 'proprietor' (executive oversight) and 'student' (CBT / results logins).
--
-- IMPORTANT: enum values added here can only be USED once this file's
-- transaction has committed. All usage lives in the next migration
-- (20261001000001_platform_expand.sql). Keep this file to ADD VALUE only.
-- =============================================================================

alter type user_role add value if not exists 'proprietor';
alter type user_role add value if not exists 'student';
