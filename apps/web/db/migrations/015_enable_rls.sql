-- Migration 015: Enable Row Level Security on user-facing tables
-- IMPORTANT: Must ENABLE before FORCE

BEGIN;

-- Enable RLS on responses and answers tables
ALTER TABLE surveys.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys.answers ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (defense in depth)
-- This ensures RLS is enforced even when connected as the table owner
ALTER TABLE surveys.responses FORCE ROW LEVEL SECURITY;
ALTER TABLE surveys.answers FORCE ROW LEVEL SECURITY;

COMMIT;
