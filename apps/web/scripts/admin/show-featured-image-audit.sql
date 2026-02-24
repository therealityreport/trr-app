-- SHOW featured-image integrity audit (read-only)
-- Validates featured image pointers on core.shows against core.show_images.

WITH featured_refs AS (
  SELECT
    s.id AS show_id,
    s.name AS show_name,
    'primary_poster_image_id'::text AS field_name,
    s.primary_poster_image_id AS image_id,
    'poster'::text AS expected_kind
  FROM core.shows s
  WHERE s.primary_poster_image_id IS NOT NULL

  UNION ALL

  SELECT
    s.id AS show_id,
    s.name AS show_name,
    'primary_backdrop_image_id'::text AS field_name,
    s.primary_backdrop_image_id AS image_id,
    'backdrop'::text AS expected_kind
  FROM core.shows s
  WHERE s.primary_backdrop_image_id IS NOT NULL
),
joined AS (
  SELECT
    r.show_id,
    r.show_name,
    r.field_name,
    r.image_id,
    r.expected_kind,
    i.id AS found_image_id,
    i.show_id AS image_show_id,
    lower(trim(COALESCE(i.image_type, i.kind, ''))) AS image_kind_token
  FROM featured_refs r
  LEFT JOIN core.show_images i
    ON i.id = r.image_id
)
SELECT
  j.show_id,
  j.show_name,
  j.field_name,
  j.image_id,
  CASE
    WHEN j.found_image_id IS NULL THEN 'dangling_reference'
    WHEN j.image_show_id <> j.show_id THEN 'cross_show_reference'
    WHEN j.expected_kind = 'poster' AND j.image_kind_token <> 'poster' THEN 'wrong_kind'
    WHEN j.expected_kind = 'backdrop' AND j.image_kind_token NOT IN ('backdrop', 'background') THEN 'wrong_kind'
    ELSE 'ok'
  END AS status,
  j.image_show_id,
  j.image_kind_token
FROM joined j
WHERE
  j.found_image_id IS NULL
  OR j.image_show_id <> j.show_id
  OR (j.expected_kind = 'poster' AND j.image_kind_token <> 'poster')
  OR (j.expected_kind = 'backdrop' AND j.image_kind_token NOT IN ('backdrop', 'background'))
ORDER BY j.show_name, j.field_name;
