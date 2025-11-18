BEGIN;

-- Seed initial surveys
INSERT INTO surveys (key, title, description, response_table_name, show_id, season_number, episode_number, is_active)
VALUES
  (
    'global_profile',
    'Global Profile Survey',
    'One-time demographics & psychographics profile',
    'survey_global_profile_responses',
    NULL,
    NULL,
    NULL,
    true
  ),
  (
    'rhoslc_s6',
    'RHOSLC S6 Weekly Survey',
    'Bravo RHOSLC Season 6 weekly cast rankings & ratings',
    'survey_rhoslc_s6_responses',
    'RHOSLC',
    6,
    NULL,
    true
  ),
  (
    'survey_x',
    'Survey X – Viewer Habits',
    'One-time viewing habits / platforms / devices survey',
    'survey_x_responses',
    NULL,
    NULL,
    NULL,
    true
  )
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  response_table_name = EXCLUDED.response_table_name,
  show_id = EXCLUDED.show_id,
  season_number = EXCLUDED.season_number,
  episode_number = EXCLUDED.episode_number,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
