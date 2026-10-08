-- =============================================================================
-- Qwerty Crate · REMOVE THE FAKE SAMPLE DATA
--
-- Deletes ONLY the rows created by supabase/seed.sql, matched by their exact
-- slugs, so any real levels and players you added stay.
-- * Their records and position history are removed automatically
--   (on delete cascade).
-- * Your real levels are then renumbered 1, 2, 3 ... with no gaps (the
--   levels_close_gaps trigger does this).
-- Note: records of REAL players on sample levels (or of sample players on
-- real levels) are deleted too, because one side of them no longer exists.
--
-- How to run: Supabase dashboard -> SQL Editor -> paste this file -> Run.
-- =============================================================================

delete from public.levels
where slug in (
  'sample-level-1', 'sample-level-2', 'sample-level-3', 'sample-level-4',
  'sample-level-5', 'sample-level-6', 'sample-level-7', 'sample-level-8',
  'sample-level-9', 'sample-level-10', 'sample-level-11', 'sample-level-12'
);

delete from public.players
where slug in (
  'player-alpha', 'player-bravo', 'player-charlie',
  'player-delta', 'player-echo', 'player-foxtrot'
);
