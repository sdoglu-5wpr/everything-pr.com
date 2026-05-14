
INSERT INTO posts (id, slug, title, status, type, article_type, pillar_slug, pillar_index, author_id, content_html, excerpt, published_at, modified_at)
VALUES
  (112735, 'state-of-defense-tech-2026', 'The State of Defense-Tech in 2026', 'draft', 'post', 'pillar', 'defense', 1, 1052, '', 'Placeholder — content lands in Phase 2c content drop.', NULL, now()),
  (112736, 'pentagon-press-strategy', 'Pentagon Press Strategy: What Works', 'draft', 'post', 'pillar', 'defense', 2, 1052, '', 'Placeholder — content lands in Phase 2c content drop.', NULL, now()),
  (112737, 'defense-tech-unicorn-playbook', 'The Defense-Tech Unicorn Playbook: Anduril, Palantir, Shield AI, Helsing', 'draft', 'post', 'pillar', 'defense', 3, 1052, '', 'Placeholder — content lands in Phase 2c content drop.', NULL, now()),
  (112738, 'congressional-appropriations-communications', 'Congressional Appropriations Communications', 'draft', 'post', 'pillar', 'defense', 4, 1052, '', 'Placeholder — content lands in Phase 2c content drop.', NULL, now()),
  (112739, 'dual-use-brand-positioning', 'Dual-Use Technology Brand Positioning', 'draft', 'post', 'pillar', 'defense', 5, 1052, '', 'Placeholder — content lands in Phase 2c content drop.', NULL, now()),
  (112740, 'itar-aware-messaging', 'ITAR-Aware Messaging for Defense Founders', 'draft', 'post', 'pillar', 'defense', 6, 1052, '', 'Placeholder — content lands in Phase 2c content drop.', NULL, now()),
  (112741, 'crisis-communications-defense-contractors', 'Crisis Communications for Defense Contractors', 'draft', 'post', 'pillar', 'defense', 7, 1052, '', 'Placeholder — content lands in Phase 2c content drop.', NULL, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO post_categories (post_id, category_id)
SELECT id, 27956 FROM posts WHERE id BETWEEN 112735 AND 112741
ON CONFLICT (post_id, category_id) DO NOTHING;
