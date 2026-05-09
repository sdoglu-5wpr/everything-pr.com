-- Snapshot affected posts
INSERT INTO post_revisions (post_id, kind, title, content_html)
SELECT id, 'autosave', title, content_html
FROM posts
WHERE status='publish' AND (
  content_html ~* 'href="[^"]*5wpr\.com/(services/(public-relations|digital-marketing|crisis-communications)|practice/geo-optimization|he/research/claude-in-israel-startup-nation-study)' OR
  content_html ~* 'href="[^"]*vogue\.com/tag/misc/weddings' OR
  content_html ~* 'href="[^"]*calcalistech\.com/ctechnews/article/r1dh0ma5xg' OR
  content_html ~* 'href="[^"]*stockanalysis\.com/article/invest-in-cognition-stock' OR
  content_html ~* 'href="[^"]*voice\.lapaas\.com/cursor-to-raise-2b' OR
  content_html ~* 'href="https?://(www\.)?redfin\.com/?"' OR
  content_html ~* 'href="https?://(www\.)?crystallake\.org/\)"' OR
  content_html ~* 'href="[^"]*hautemediagroup\.com' OR
  content_html ~* 'href="[^"]*hautewealth\.ai'
);

-- Fix malformed crystallake.org href (remove stray ')')
UPDATE posts
SET content_html = regexp_replace(content_html,
  'href="(https?://(?:www\.)?crystallake\.org/)\)"', 'href="\1"', 'gi'),
    modified_at = now()
WHERE content_html ~* 'href="https?://(www\.)?crystallake\.org/\)"';

-- Unwrap broken anchors: <a ... href="BROKEN..." ...>TEXT</a>  ->  TEXT
UPDATE posts SET content_html = regexp_replace(
  content_html,
  '<a\s[^>]*href="[^"]*(?:5wpr\.com/(?:services/(?:public-relations|digital-marketing|crisis-communications)|practice/geo-optimization|he/research/claude-in-israel-startup-nation-study)|vogue\.com/tag/misc/weddings|calcalistech\.com/ctechnews/article/r1dh0ma5xg|stockanalysis\.com/article/invest-in-cognition-stock|voice\.lapaas\.com/cursor-to-raise-2b|hautemediagroup\.com|hautewealth\.ai)[^"]*"[^>]*>(.*?)</a>',
  '\2', 'gis'),
  modified_at = now()
WHERE status='publish';

-- Unwrap bare redfin.com root links
UPDATE posts SET content_html = regexp_replace(
  content_html,
  '<a\s[^>]*href="https?://(?:www\.)?redfin\.com/?"[^>]*>(.*?)</a>',
  '\1', 'gis'),
  modified_at = now()
WHERE status='publish' AND content_html ~* 'href="https?://(www\.)?redfin\.com/?"';