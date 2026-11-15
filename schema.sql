-- 拉爾妮蒂的直播點歌庫：Supabase schema
-- 先在 Supabase SQL Editor 執行本檔。
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_songbook_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default '',
  category text not null default '華語',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 歌詞獨立存放，避免公開訪客透過 API 讀到歌詞。
create table if not exists public.song_lyrics (
  song_id uuid primary key references public.songs(id) on delete cascade,
  lyrics text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.songs enable row level security;
alter table public.song_lyrics enable row level security;

drop policy if exists "Public can read song list" on public.songs;
create policy "Public can read song list" on public.songs
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage songs" on public.songs;
create policy "Admins manage songs" on public.songs
  for all to authenticated
  using (public.is_songbook_admin())
  with check (public.is_songbook_admin());

drop policy if exists "Admins read own admin record" on public.admin_users;
create policy "Admins read own admin record" on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins manage lyrics" on public.song_lyrics;
create policy "Admins manage lyrics" on public.song_lyrics
  for all to authenticated
  using (public.is_songbook_admin())
  with check (public.is_songbook_admin());

-- 管理員建立方式：
-- 1. 在 Supabase Authentication > Users 建立直播主帳號。
-- 2. 複製該帳號的 UUID。
-- 3. 將下方 YOUR_AUTH_USER_UUID 換成真實 UUID，再單獨執行：
-- insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');
--
-- 不要把 service_role key 放進前端 .env 或任何公開程式碼。
