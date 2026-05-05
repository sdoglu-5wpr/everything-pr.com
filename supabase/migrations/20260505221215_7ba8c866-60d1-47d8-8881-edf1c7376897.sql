
UPDATE public.categories
SET name = replace(replace(replace(replace(replace(name,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE name ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.categories
SET description = replace(replace(replace(replace(replace(description,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE description ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.tags
SET name = replace(replace(replace(replace(replace(name,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE name ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.tags
SET description = replace(replace(replace(replace(replace(description,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE description ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.posts
SET title = replace(replace(replace(replace(replace(title,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE title ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.posts
SET excerpt = replace(replace(replace(replace(replace(excerpt,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE excerpt ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.authors
SET display_name = replace(replace(replace(replace(replace(display_name,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE display_name ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.menu_items
SET label = replace(replace(replace(replace(replace(label,
  '&amp;','&'),
  '&#039;',''''),
  '&quot;','"'),
  '&lt;','<'),
  '&gt;','>')
WHERE label ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.seo_meta
SET title = replace(replace(replace(replace(replace(title,'&amp;','&'),'&#039;',''''),'&quot;','"'),'&lt;','<'),'&gt;','>')
WHERE title ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.seo_meta
SET description = replace(replace(replace(replace(replace(description,'&amp;','&'),'&#039;',''''),'&quot;','"'),'&lt;','<'),'&gt;','>')
WHERE description ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.seo_meta
SET og_title = replace(replace(replace(replace(replace(og_title,'&amp;','&'),'&#039;',''''),'&quot;','"'),'&lt;','<'),'&gt;','>')
WHERE og_title ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.seo_meta
SET og_description = replace(replace(replace(replace(replace(og_description,'&amp;','&'),'&#039;',''''),'&quot;','"'),'&lt;','<'),'&gt;','>')
WHERE og_description ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.seo_meta
SET twitter_title = replace(replace(replace(replace(replace(twitter_title,'&amp;','&'),'&#039;',''''),'&quot;','"'),'&lt;','<'),'&gt;','>')
WHERE twitter_title ~ '&(amp|#039|quot|lt|gt);';

UPDATE public.seo_meta
SET twitter_description = replace(replace(replace(replace(replace(twitter_description,'&amp;','&'),'&#039;',''''),'&quot;','"'),'&lt;','<'),'&gt;','>')
WHERE twitter_description ~ '&(amp|#039|quot|lt|gt);';
