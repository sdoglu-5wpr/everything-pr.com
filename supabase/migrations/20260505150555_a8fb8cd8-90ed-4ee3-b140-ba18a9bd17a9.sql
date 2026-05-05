alter table public.posts add column if not exists first_inline_image text;

create or replace function public.posts_extract_first_image()
returns trigger language plpgsql set search_path = public as $$
declare
  m text;
begin
  if NEW.content_html is null or NEW.content_html = '' then
    NEW.first_inline_image := null;
    return NEW;
  end if;
  m := (regexp_match(NEW.content_html, '<img[^>]+src\s*=\s*"([^"]+)"', 'i'))[1];
  if m is null then
    m := (regexp_match(NEW.content_html, '<img[^>]+src\s*=\s*''([^'']+)''', 'i'))[1];
  end if;
  NEW.first_inline_image := m;
  return NEW;
end $$;

drop trigger if exists trg_posts_first_image on public.posts;
create trigger trg_posts_first_image
before insert or update of content_html on public.posts
for each row execute function public.posts_extract_first_image();
