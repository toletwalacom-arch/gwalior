-- Run this once in the Supabase SQL Editor for the project.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  username text not null default '',
  phone text,
  city text not null default 'City Centre',
  bio text not null default '',
  interests text[] not null default '{}',
  avatar_url text,
  banner_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists username text not null default '';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists city text not null default 'City Centre';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view profile media" on storage.objects;
create policy "Public can view profile media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profile-media');

drop policy if exists "Users can upload their own profile media" on storage.objects;
create policy "Users can upload their own profile media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update their own profile media" on storage.objects;
create policy "Users can update their own profile media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own profile media" on storage.objects;
create policy "Users can delete their own profile media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop index if exists public.profiles_username_unique;

-- Normalize existing usernames to the persisted .gwl form, resolving any
-- collisions deterministically before creating the case-insensitive index.
do $$
declare
  profile_row record;
  username_base text;
  stored_username text;
begin
  for profile_row in
    select id, username
    from public.profiles
    order by id
  loop
    username_base := lower(regexp_replace(
      coalesce(nullif(btrim(profile_row.username), ''), 'user-' || substr(profile_row.id::text, 1, 8)),
      '\.gwl$',
      '',
      'i'
    ));
    username_base := left(regexp_replace(username_base, '[^a-z0-9_-]+', '-', 'g'), 24);
    if length(username_base) < 3 then
      username_base := 'user-' || substr(profile_row.id::text, 1, 8);
    end if;

    stored_username := username_base || '.gwl';
    if exists (
      select 1 from public.profiles p
      where lower(p.username) = stored_username and p.id <> profile_row.id
    ) then
      stored_username := left(username_base, 14) || '-' || substr(profile_row.id::text, 1, 8) || '.gwl';
    end if;

    update public.profiles set username = stored_username where id = profile_row.id;
  end loop;
end;
$$;

create unique index profiles_username_unique on public.profiles (lower(username));

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_not_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_id_idx on public.user_follows (following_id);

create table if not exists public.community_groups (
  id text primary key,
  name text not null unique,
  description text not null,
  interest_tags text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists community_groups_lower_name_uidx
  on public.community_groups (lower(name));

create table if not exists public.community_group_members (
  group_id text not null references public.community_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists community_group_members_user_id_idx on public.community_group_members (user_id);

insert into public.community_groups (id, name, description, interest_tags)
values
  ('gwalior-foodies', 'Gwalior Foodies', 'Food discussions, local favourites and recommendations from across Gwalior.', array['Street Food', 'Restaurants', 'Gwalior Food', 'Gwalior Street Food', 'Local Food Spots']),
  ('gwalior-tech-community', 'Gwalior Tech Community', 'Technology, programming and startup conversations for Gwalior.', array['Technology', 'Programming', 'Web Development', 'Artificial Intelligence', 'Gwalior Startups']),
  ('gwalior-jobs-careers', 'Gwalior Jobs & Careers', 'Local jobs, career advice, internships and opportunities.', array['Government Jobs', 'Private Jobs', 'Internships', 'Career Development', 'Skill Development']),
  ('gwalior-students', 'Gwalior Students', 'A community for students, study groups, exams and campus life.', array['College Life', 'Competitive Exams', 'JEE & NEET', 'Study Groups', 'Career Guidance']),
  ('gwalior-entrepreneurs', 'Gwalior Entrepreneurs', 'Connect with local founders, small businesses and people building new ideas.', array['Entrepreneurship', 'Startups', 'Small Businesses', 'Networking', 'Gwalior Businesses'])
on conflict (id) do nothing;

create table if not exists public.user_interest_feedback (
  user_id uuid not null references public.profiles (id) on delete cascade,
  interest_tag text not null,
  adjustment smallint not null check (adjustment in (-2, -1, 1)),
  updated_at timestamptz not null default now(),
  primary key (user_id, interest_tag)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  category text not null,
  location text not null,
  visibility text not null default 'public',
  image_url text,
  group_id text references public.community_groups (id) on delete set null,
  likes_count bigint not null default 0 check (likes_count >= 0),
  comments_count bigint not null default 0 check (comments_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists likes_count bigint not null default 0;
alter table public.posts add column if not exists comments_count bigint not null default 0;
alter table public.posts add column if not exists interest_tags text[] not null default '{}';
alter table public.posts add column if not exists group_id text references public.community_groups (id) on delete set null;
alter table public.posts drop constraint if exists posts_interest_tags_limit;
alter table public.posts add constraint posts_interest_tags_limit
  check (cardinality(interest_tags) <= 3);

create index if not exists posts_user_id_created_at_idx on public.posts (user_id, created_at desc);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_interest_tags_idx on public.posts using gin (interest_tags);
create index if not exists posts_group_created_at_idx on public.posts (group_id, created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_id_idx on public.post_likes (user_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  author_full_name text not null default '',
  author_username text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_created_at_idx on public.comments (post_id, created_at);
create index if not exists comments_parent_comment_id_idx on public.comments (parent_comment_id);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_user_id_idx on public.comment_likes (user_id);

update public.posts p
set likes_count = (select count(*) from public.post_likes pl where pl.post_id = p.id),
    comments_count = (select count(*) from public.comments c where c.post_id = p.id);

create or replace function public.update_post_interaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_post_id uuid;
  count_change bigint;
begin
  if tg_op = 'INSERT' then
    target_post_id := new.post_id;
    count_change := 1;
  else
    target_post_id := old.post_id;
    count_change := -1;
  end if;

  if tg_table_name = 'post_likes' then
    update public.posts
    set likes_count = greatest(0, likes_count + count_change)
    where id = target_post_id;
  elsif tg_table_name = 'comments' then
    update public.posts
    set comments_count = greatest(0, comments_count + count_change)
    where id = target_post_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists update_post_likes_count on public.post_likes;
create trigger update_post_likes_count
  after insert or delete on public.post_likes
  for each row execute procedure public.update_post_interaction_counts();

drop trigger if exists update_post_comments_count on public.comments;
create trigger update_post_comments_count
  after insert or delete on public.comments
  for each row execute procedure public.update_post_interaction_counts();

create or replace function public.set_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_row public.profiles%rowtype;
begin
  if new.parent_comment_id is not null and not exists (
    select 1 from public.comments parent
    where parent.id = new.parent_comment_id
      and parent.post_id = new.post_id
  ) then
    raise exception 'Reply must belong to the same post as its parent comment.';
  end if;

  select * into profile_row from public.profiles where id = new.user_id;
  if not found then
    raise exception 'A profile is required before commenting.';
  end if;
  new.author_full_name := profile_row.full_name;
  new.author_username := profile_row.username;
  return new;
end;
$$;

drop trigger if exists set_comment_author_before_write on public.comments;
create trigger set_comment_author_before_write
  before insert on public.comments
  for each row execute procedure public.set_comment_author();

drop function if exists public.get_community_posts();
create function public.get_community_posts()
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  content text,
  category text,
  location text,
  image_url text,
  created_at timestamptz,
  likes_count bigint,
  comments_count bigint,
  liked_by_me boolean,
  interest_tags text[],
  following_by_me boolean,
  is_own_post boolean,
  group_id text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.user_id,
    coalesce(pr.full_name, 'Community member'),
    coalesce(pr.username, ''),
    pr.avatar_url,
    p.content,
    p.category,
    p.location,
    p.image_url,
    p.created_at,
    p.likes_count,
    p.comments_count,
    exists (
      select 1 from public.post_likes pl
      where pl.post_id = p.id and pl.user_id = auth.uid()
    ),
    coalesce(p.interest_tags, '{}'::text[]),
    exists (
      select 1 from public.user_follows uf
      where uf.follower_id = auth.uid() and uf.following_id = p.user_id
    ),
    p.user_id = auth.uid(),
    p.group_id
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  where auth.uid() is not null
    and (lower(p.visibility) = 'public' or p.user_id = auth.uid())
  order by p.created_at desc;
$$;

drop function if exists public.get_personalized_community_posts(text, integer, integer);
create function public.get_personalized_community_posts(
  p_feed text default 'for_you',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  content text,
  category text,
  location text,
  image_url text,
  created_at timestamptz,
  likes_count bigint,
  comments_count bigint,
  liked_by_me boolean,
  interest_tags text[],
  following_by_me boolean,
  is_own_post boolean,
  group_id text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with user_preferences as (
    select coalesce(pr.interests, '{}'::text[]) as interests
    from public.profiles pr
    where pr.id = auth.uid()
  ),
  followed_users as (
    select uf.following_id
    from public.user_follows uf
    where uf.follower_id = auth.uid()
  ),
  follower_users as (
    select uf.follower_id
    from public.user_follows uf
    where uf.following_id = auth.uid()
  ),
  joined_groups as (
    select gm.group_id
    from public.community_group_members gm
    where gm.user_id = auth.uid()
  ),
  behavior_interests as (
    select tag, sum(weight) as affinity
    from (
      select post_tag.tag, 2::numeric as weight
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      cross join lateral unnest(p.interest_tags) as post_tag(tag)
      where pl.user_id = auth.uid()
      union all
      select post_tag.tag, 3::numeric as weight
      from public.comments c
      join public.posts p on p.id = c.post_id
      cross join lateral unnest(p.interest_tags) as post_tag(tag)
      where c.user_id = auth.uid()
    ) interactions
    group by tag
  ),
  interest_feedback as (
    select uif.interest_tag, uif.adjustment
    from public.user_interest_feedback uif
    where uif.user_id = auth.uid()
  ),
  scored_posts as (
    select
      p.id,
      p.user_id,
      coalesce(pr.full_name, 'Community member') as full_name,
      coalesce(pr.username, '') as username,
      pr.avatar_url,
      p.content,
      p.category,
      p.location,
      p.image_url,
      p.created_at,
      p.likes_count,
      p.comments_count,
      exists (
        select 1 from public.post_likes pl
        where pl.post_id = p.id and pl.user_id = auth.uid()
      ) as liked_by_me,
      coalesce(p.interest_tags, '{}'::text[]) as interest_tags,
      p.group_id,
      exists (
        select 1 from public.user_follows uf
        where uf.follower_id = auth.uid() and uf.following_id = p.user_id
      ) as following_by_me,
      p.user_id = auth.uid() as is_own_post,
      exists(select 1 from followed_users fu where fu.following_id = p.user_id) as is_followed,
      exists(select 1 from follower_users fr where fr.follower_id = p.user_id) as is_follower,
      exists(select 1 from joined_groups jg where jg.group_id = p.group_id) as is_joined_group,
      coalesce((
        select count(*)
        from unnest(coalesce(p.interest_tags, '{}'::text[])) as post_tag(tag)
        where array_position(
          coalesce((select interests from user_preferences), '{}'::text[]),
          post_tag.tag
        ) is not null
      ), 0)::integer as matched_interests,
      (lower(p.location) like '%gwalior%' or lower(p.location) = 'all gwalior') as is_local,
      (
        case
          when cardinality((select interests from user_preferences)) > 0 then
            25.0 * coalesce((
              select count(*)
              from unnest(coalesce(p.interest_tags, '{}'::text[])) as post_tag(tag)
              where array_position(
                coalesce((select interests from user_preferences), '{}'::text[]),
                post_tag.tag
              ) is not null
            ), 0) / cardinality((select interests from user_preferences))
          else 0
        end
        + case when exists(select 1 from joined_groups jg where jg.group_id = p.group_id) then 15 else 0 end
        + least(20, coalesce((
            select sum(bi.affinity)
            from unnest(coalesce(p.interest_tags, '{}'::text[])) as post_tag(tag)
            join behavior_interests bi on bi.tag = post_tag.tag
          ), 0)::numeric * 100 / greatest(coalesce((select max(affinity) from behavior_interests), 0), 1))
        + coalesce(15.0 * power(
            0.5,
            greatest(extract(epoch from (now() - p.created_at)) / 3600, 0) / 24
          ), 0)
        + 10.0 * least(1, ln(1 + p.likes_count + p.comments_count) / ln(101))
          + case
              when exists(select 1 from followed_users fu where fu.following_id = p.user_id)
                or exists(select 1 from follower_users fr where fr.follower_id = p.user_id)
              then 10 else 0
            end
        + case when lower(p.location) like '%gwalior%' or lower(p.location) = 'all gwalior' then 5 else 0 end
        + coalesce((
            select sum(ifb.adjustment * 5)
            from unnest(coalesce(p.interest_tags, '{}'::text[])) as post_tag(tag)
            join interest_feedback ifb on ifb.interest_tag = post_tag.tag
          ), 0)
      ) as relevance_score
    from public.posts p
    left join public.profiles pr on pr.id = p.user_id
    where auth.uid() is not null
      and (lower(p.visibility) = 'public' or p.user_id = auth.uid())
      and (
        p_feed <> 'following'
        or exists(select 1 from followed_users fu where fu.following_id = p.user_id)
        or exists(select 1 from follower_users fr where fr.follower_id = p.user_id)
      )
      and (
        p_feed <> 'for_you'
        or not exists (
          select 1
          from public.user_interest_feedback uif
          where uif.user_id = auth.uid()
            and uif.adjustment = -2
            and uif.interest_tag = any(coalesce(p.interest_tags, '{}'::text[]))
        )
      )
  ),
  ranked_posts as (
    select
      scored_posts.*,
      row_number() over (
        partition by matched_interests > 0 or is_followed or is_follower or is_joined_group
        order by relevance_score desc, created_at desc
      ) as relevance_rank,
      row_number() over (
        partition by is_local and matched_interests = 0
        order by created_at desc
      ) as local_rank,
      row_number() over (order by created_at desc) as latest_rank,
      row_number() over (
        order by
          (1 + likes_count + comments_count)
          / (1 + greatest(extract(epoch from (now() - created_at)) / 86400, 0)) desc,
          created_at desc
      ) as trending_rank
    from scored_posts
  ),
  ordered_posts as (
    select ranked_posts.*
    from ranked_posts
    order by
      case
        when p_feed = 'latest' then latest_rank::numeric
        when p_feed = 'trending' then trending_rank::numeric
        when p_feed = 'following' then latest_rank::numeric
        when matched_interests > 0 or is_followed or is_follower or is_joined_group
          then relevance_rank + floor((relevance_rank - 1) / 4.0)
        when is_local then local_rank * 5
        else 100000 + latest_rank
      end,
      created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 50))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    op.id,
    op.user_id,
    op.full_name,
    op.username,
    op.avatar_url,
    op.content,
    op.category,
    op.location,
    op.image_url,
    op.created_at,
    op.likes_count,
    op.comments_count,
    op.liked_by_me,
    op.interest_tags,
    op.following_by_me,
    op.is_own_post,
    op.group_id
  from ordered_posts op;
$$;

create or replace function public.get_recommended_community_groups(p_limit integer default 5)
returns table (
  id text,
  name text,
  description text,
  interest_tags text[],
  matching_interests text[],
  member_count bigint,
  joined_by_me boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with user_preferences as (
    select coalesce(pr.interests, '{}'::text[]) as interests
    from public.profiles pr
    where pr.id = auth.uid()
  ),
  matching_groups as (
    select
      g.id,
      g.name,
      g.description,
      g.interest_tags,
      coalesce(array(
        select tag
        from unnest(g.interest_tags) as group_tag(tag)
        where array_position(
          coalesce((select interests from user_preferences), '{}'::text[]),
          group_tag.tag
        ) is not null
      ), '{}'::text[]) as matching_interests,
      (select count(*) from public.community_group_members gm where gm.group_id = g.id) as member_count,
      exists (
        select 1 from public.community_group_members gm
        where gm.group_id = g.id and gm.user_id = auth.uid()
      ) as joined_by_me
    from public.community_groups g
    where g.is_active
      and auth.uid() is not null
      and not exists (
        select 1 from public.community_group_members joined
        where joined.group_id = g.id and joined.user_id = auth.uid()
      )
  )
  select
    mg.id,
    mg.name,
    mg.description,
    mg.interest_tags,
    mg.matching_interests,
    mg.member_count,
    mg.joined_by_me
  from matching_groups mg
  order by cardinality(mg.matching_interests) desc, mg.member_count desc, mg.name
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

create or replace function public.get_popular_community_groups(p_limit integer default 10)
returns table (
  id text,
  name text,
  member_count bigint,
  joined_by_me boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    g.id,
    g.name,
    (select count(*) from public.community_group_members gm where gm.group_id = g.id) as member_count,
    exists (
      select 1
      from public.community_group_members gm
      where gm.group_id = g.id and gm.user_id = auth.uid()
    ) as joined_by_me
  from public.community_groups g
  where g.is_active
  order by member_count desc, g.name
  limit greatest(1, least(coalesce(p_limit, 10), 20));
$$;

create or replace function public.create_community_group(
  p_name text,
  p_description text,
  p_interest_tags text[] default '{}'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  clean_name text := trim(coalesce(p_name, ''));
  clean_description text := trim(coalesce(p_description, ''));
  clean_tags text[] := coalesce(p_interest_tags, '{}');
  new_group_id text;
begin
  if current_user_id is null then
    raise exception 'Log in to create a community.';
  end if;

  if length(clean_name) < 3 or length(clean_name) > 60 then
    raise exception 'Community name must be between 3 and 60 characters.';
  end if;

  if length(clean_description) < 10 or length(clean_description) > 300 then
    raise exception 'Description must be between 10 and 300 characters.';
  end if;

  if cardinality(clean_tags) > 3
    or exists (
      select 1
        from unnest(clean_tags) as tags(value)
        where value is null or length(trim(value)) = 0 or length(trim(value)) > 60
    )
  then
    raise exception 'Choose up to 3 valid community topics.';
  end if;

  if exists (
    select 1 from public.community_groups g where lower(g.name) = lower(clean_name)
  ) then
    raise exception 'A community with that name already exists.';
  end if;

  new_group_id :=
    trim(both '-' from lower(regexp_replace(clean_name, '[^a-zA-Z0-9]+', '-', 'g')))
    || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.community_groups (id, name, description, interest_tags, created_by)
  values (new_group_id, clean_name, clean_description, clean_tags, current_user_id);

  insert into public.community_group_members (group_id, user_id)
  values (new_group_id, current_user_id);

  return new_group_id;
end;
$$;

create or replace function public.get_trending_topics(
  p_period text default '24h',
  p_category text default null,
  p_limit integer default 10
)
returns table (
  topic text,
  category text,
  discussion_count bigint,
  contributor_count bigint,
  interaction_count bigint,
  growth_percent numeric,
  last_activity_at timestamptz,
  trend_score numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with settings as (
    select case p_period
      when '2h' then interval '2 hours'
      when '7d' then interval '7 days'
      else interval '24 hours'
    end as window_size
  ),
  topic_posts as (
    select
      tag.topic,
      p.category,
      p.id,
      p.user_id,
      p.created_at,
      (
        select count(*) from public.post_likes pl
        where pl.post_id = p.id
          and pl.created_at >= now() - (select window_size from settings)
      ) + (
        select count(*) from public.comments c
        where c.post_id = p.id
          and c.created_at >= now() - (select window_size from settings)
      ) as current_interactions,
      (
        select count(*) from public.post_likes pl
        where pl.post_id = p.id
          and pl.created_at >= now() - (select window_size * 2 from settings)
          and pl.created_at < now() - (select window_size from settings)
      ) + (
        select count(*) from public.comments c
        where c.post_id = p.id
          and c.created_at >= now() - (select window_size * 2 from settings)
          and c.created_at < now() - (select window_size from settings)
      ) as previous_interactions
    from public.posts p
    cross join lateral unnest(p.interest_tags) as tag(topic)
    where auth.uid() is not null
      and lower(p.visibility) = 'public'
      and p.created_at >= now() - (select window_size * 2 from settings)
      and (p_category is null or p_category = '' or lower(p.category) = lower(p_category))
      and (lower(p.location) like '%gwalior%' or lower(p.location) = 'all gwalior')
  ),
  current_window as (
    select
      tp.topic,
      max(tp.category) as category,
      count(distinct tp.id) as discussion_count,
      count(distinct tp.user_id) as contributor_count,
      sum(tp.current_interactions)::bigint as interaction_count,
      max(tp.created_at) as last_activity_at
    from topic_posts tp
    where tp.created_at >= now() - (select window_size from settings)
    group by tp.topic
  ),
  previous_window as (
    select
      tp.topic,
      count(distinct tp.id) as discussion_count,
      sum(tp.previous_interactions)::bigint as interaction_count
    from topic_posts tp
    where tp.created_at < now() - (select window_size from settings)
    group by tp.topic
  ),
  eligible_topics as (
    select
      cw.topic,
      cw.category,
      cw.discussion_count,
      cw.contributor_count,
      cw.interaction_count,
      coalesce(pw.discussion_count, 0) as previous_discussions,
      coalesce(pw.interaction_count, 0) as previous_interactions,
      cw.last_activity_at
    from current_window cw
    left join previous_window pw on pw.topic = cw.topic
    where cw.discussion_count >= 3
      and cw.contributor_count >= 3
  ),
  normalized as (
    select
      et.*,
      least(100, 100.0 * ln(1 + et.discussion_count) / ln(1 + max(et.discussion_count) over ())) as discussion_score,
      least(100, 100.0 * greatest(et.interaction_count - et.previous_interactions, 0) / (et.previous_interactions + 1)) as growth_score,
      least(100, 100.0 * ln(1 + et.contributor_count) / ln(1 + max(et.contributor_count) over ())) as contributor_score,
      least(100, 100.0 * ln(1 + et.interaction_count) / ln(1 + max(et.interaction_count) over ())) as engagement_score,
      100.0 * power(0.5, greatest(extract(epoch from (now() - et.last_activity_at)) / 3600, 0) / 24) as freshness_score
    from eligible_topics et
  )
  select
    n.topic,
    n.category,
    n.discussion_count,
    n.contributor_count,
    n.interaction_count,
    round(100.0 * (n.interaction_count - n.previous_interactions) / (n.previous_interactions + 1), 1) as growth_percent,
    n.last_activity_at,
    round((
      n.discussion_score * 0.25
      + n.growth_score * 0.25
      + n.contributor_score * 0.20
      + n.engagement_score * 0.15
      + n.freshness_score * 0.10
      + 5.0
    )::numeric, 2) as trend_score
  from normalized n
  order by trend_score desc, n.last_activity_at desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

drop function if exists public.get_post_comments(uuid);
create function public.get_post_comments(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  parent_comment_id uuid,
  content text,
  author_full_name text,
  author_username text,
  author_avatar_url text,
  created_at timestamptz,
  likes_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.post_id,
    c.user_id,
    c.parent_comment_id,
    c.content,
    c.author_full_name,
    c.author_username,
    pr.avatar_url,
    c.created_at,
    (select count(*) from public.comment_likes cl where cl.comment_id = c.id),
    exists (
      select 1 from public.comment_likes cl
      where cl.comment_id = c.id and cl.user_id = auth.uid()
    )
  from public.comments c
  left join public.profiles pr on pr.id = c.user_id
  where c.post_id = p_post_id and auth.uid() is not null
  order by c.created_at asc;
$$;

create or replace function public.get_post_likers(
  p_post_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  liked_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pr.id, pr.full_name, pr.username, pr.avatar_url, pl.created_at
  from public.post_likes pl
  join public.profiles pr on pr.id = pl.user_id
  where pl.post_id = p_post_id
    and auth.uid() is not null
  order by pl.created_at desc, pr.id
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;

drop policy if exists "Authenticated users can read post likes" on public.post_likes;
create policy "Authenticated users can read post likes"
  on public.post_likes for select to authenticated using (true);

drop policy if exists "Users can like posts as themselves" on public.post_likes;
create policy "Users can like posts as themselves"
  on public.post_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their post likes" on public.post_likes;
create policy "Users can remove their post likes"
  on public.post_likes for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read comments" on public.comments;
create policy "Authenticated users can read comments"
  on public.comments for select to authenticated using (true);

drop policy if exists "Users can comment as themselves" on public.comments;
create policy "Users can comment as themselves"
  on public.comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
  on public.comments for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read comment likes" on public.comment_likes;
create policy "Authenticated users can read comment likes"
  on public.comment_likes for select to authenticated using (true);

drop policy if exists "Users can like comments as themselves" on public.comment_likes;
create policy "Users can like comments as themselves"
  on public.comment_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their comment likes" on public.comment_likes;
create policy "Users can remove their comment likes"
  on public.comment_likes for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, delete on public.comment_likes to authenticated;
revoke all on function public.get_community_posts() from public, anon;
revoke all on function public.get_personalized_community_posts(text, integer, integer) from public, anon;
revoke all on function public.get_recommended_community_groups(integer) from public, anon;
revoke all on function public.get_popular_community_groups(integer) from public, anon, authenticated;
revoke all on function public.create_community_group(text, text, text[]) from public, anon;
revoke all on function public.get_trending_topics(text, text, integer) from public, anon;
revoke all on function public.get_post_comments(uuid) from public, anon;
revoke all on function public.get_post_likers(uuid, integer, integer) from public, anon;
grant execute on function public.get_community_posts() to authenticated;
grant execute on function public.get_personalized_community_posts(text, integer, integer) to authenticated;
grant execute on function public.get_recommended_community_groups(integer) to authenticated;
grant execute on function public.get_popular_community_groups(integer) to anon, authenticated;
grant execute on function public.create_community_group(text, text, text[]) to authenticated;
grant execute on function public.get_trending_topics(text, text, integer) to authenticated;
grant execute on function public.get_post_comments(uuid) to authenticated;
grant execute on function public.get_post_likers(uuid, integer, integer) to authenticated;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1)),
    '[^a-z0-9_-]+',
    '-',
    'g'
  ));
  base_username := regexp_replace(base_username, '\.gwl$', '', 'i');
  base_username := trim(both '-' from base_username);
  base_username := left(base_username, 24);
  if length(base_username) < 3 then
    base_username := 'user-' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (
    id, email, full_name, username, phone, city, bio, interests
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    base_username || '.gwl',
    null,
    coalesce(nullif(new.raw_user_meta_data ->> 'city', ''), 'City Centre'),
    '',
    '{}'::text[]
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_auth_user();

alter table public.profiles enable row level security;
alter table public.user_follows enable row level security;
alter table public.community_groups enable row level security;
alter table public.community_group_members enable row level security;
alter table public.user_interest_feedback enable row level security;
alter table public.posts enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read their follows" on public.user_follows;
create policy "Users can read their follows"
  on public.user_follows for select
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = following_id);

create or replace function public.get_profile_follow_list(
  p_profile_id uuid,
  p_list_type text
)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Log in to view follower and following lists.';
  end if;

  if p_profile_id is null or p_list_type is null or p_list_type not in ('followers', 'following') then
    raise exception 'Choose either the followers or following list.';
  end if;

  if viewer_id <> p_profile_id and not exists (
    select 1
    from public.user_follows uf
    where uf.follower_id = p_profile_id
      and uf.following_id = viewer_id
  ) then
    raise exception 'You can view these lists only if this person follows you.';
  end if;

  if p_list_type = 'followers' then
    return query
      select pr.id, pr.full_name, pr.username, pr.avatar_url
      from public.user_follows uf
      join public.profiles pr on pr.id = uf.follower_id
      where uf.following_id = p_profile_id
      order by lower(pr.full_name), pr.id;
  else
    return query
      select pr.id, pr.full_name, pr.username, pr.avatar_url
      from public.user_follows uf
      join public.profiles pr on pr.id = uf.following_id
      where uf.follower_id = p_profile_id
      order by lower(pr.full_name), pr.id;
  end if;
end;
$$;

revoke all on function public.get_profile_follow_list(uuid, text) from public, anon;
grant execute on function public.get_profile_follow_list(uuid, text) to authenticated;

create or replace function public.get_public_profile(p_profile_id uuid)
returns table (
  id uuid,
  full_name text,
  username text,
  city text,
  bio text,
  interests text[],
  avatar_url text,
  banner_url text,
  created_at timestamptz,
  posts_count bigint,
  followers_count bigint,
  following_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Log in to view community profiles.';
  end if;

  if p_profile_id is null then
    raise exception 'Choose a profile to view.';
  end if;

  return query
    select
      pr.id,
      pr.full_name,
      pr.username,
      pr.city,
      pr.bio,
      pr.interests,
      pr.avatar_url,
      pr.banner_url,
      pr.created_at,
      (
        select count(*)
        from public.posts p
        where p.user_id = pr.id
          and p.visibility = 'public'
          and p.group_id is null
      ),
      (select count(*) from public.user_follows uf where uf.following_id = pr.id),
      (select count(*) from public.user_follows uf where uf.follower_id = pr.id)
    from public.profiles pr
    where pr.id = p_profile_id;
end;
$$;

revoke all on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;

create or replace function public.get_public_profile_by_username(p_username text)
returns table (
  id uuid,
  full_name text,
  username text,
  city text,
  bio text,
  interests text[],
  avatar_url text,
  banner_url text,
  created_at timestamptz,
  posts_count bigint,
  followers_count bigint,
  following_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_username text;
begin
  if auth.uid() is null then
    raise exception 'Log in to view community profiles.';
  end if;

  normalized_username := lower(regexp_replace(btrim(p_username), '^@', ''));
  if normalized_username is null or normalized_username = '' then
    raise exception 'Choose a username to view.';
  end if;
  if right(normalized_username, 4) <> '.gwl' then
    normalized_username := normalized_username || '.gwl';
  end if;

  return query
    select
      pr.id,
      pr.full_name,
      pr.username,
      pr.city,
      pr.bio,
      pr.interests,
      pr.avatar_url,
      pr.banner_url,
      pr.created_at,
      (
        select count(*)
        from public.posts p
        where p.user_id = pr.id
          and p.visibility = 'public'
          and p.group_id is null
      ),
      (select count(*) from public.user_follows uf where uf.following_id = pr.id),
      (select count(*) from public.user_follows uf where uf.follower_id = pr.id)
    from public.profiles pr
    where lower(pr.username) = normalized_username;
end;
$$;

revoke all on function public.get_public_profile_by_username(text) from public, anon;
grant execute on function public.get_public_profile_by_username(text) to authenticated;

drop policy if exists "Users can follow from their own account" on public.user_follows;
create policy "Users can follow from their own account"
  on public.user_follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow from their own account" on public.user_follows;
create policy "Users can unfollow from their own account"
  on public.user_follows for delete
  to authenticated
  using (auth.uid() = follower_id);

drop policy if exists "Users can read their interest feedback" on public.user_interest_feedback;
create policy "Users can read their interest feedback"
  on public.user_interest_feedback for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read active groups" on public.community_groups;
create policy "Authenticated users can read active groups"
  on public.community_groups for select to authenticated
  using (is_active);

drop policy if exists "Users can read group membership" on public.community_group_members;
create policy "Users can read group membership"
  on public.community_group_members for select to authenticated
  using (true);

drop policy if exists "Users can join groups as themselves" on public.community_group_members;
create policy "Users can join groups as themselves"
  on public.community_group_members for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can leave groups themselves" on public.community_group_members;
create policy "Users can leave groups themselves"
  on public.community_group_members for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their interest feedback" on public.user_interest_feedback;
create policy "Users can add their interest feedback"
  on public.user_interest_feedback for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their interest feedback" on public.user_interest_feedback;
create policy "Users can update their interest feedback"
  on public.user_interest_feedback for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their interest feedback" on public.user_interest_feedback;
create policy "Users can remove their interest feedback"
  on public.user_interest_feedback for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
  on public.posts for select
  to authenticated
  using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      group_id is null
      or exists (
        select 1 from public.community_group_members gm
        where gm.group_id = posts.group_id and gm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.user_follows to authenticated;
grant select on public.community_groups to authenticated;
grant select, insert, delete on public.community_group_members to authenticated;
grant select, insert, update, delete on public.user_interest_feedback to authenticated;
grant select, insert, update, delete on public.posts to authenticated;

-- Private one-to-one and group messaging. Conversation membership is the
-- authorization boundary for both database rows and stored image attachments.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null check (conversation_type in ('direct', 'group')),
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id, conversation_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  reply_to_id uuid references public.messages (id) on delete set null,
  body text not null default '',
  attachment_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_body_length check (char_length(body) <= 4000),
  constraint messages_body_or_attachment check (
    deleted_at is not null or nullif(btrim(body), '') is not null or attachment_path is not null
  ),
  constraint messages_attachment_in_conversation check (
    attachment_path is null or attachment_path like conversation_id::text || '/%'
  )
);

alter table public.messages add column if not exists reply_to_id uuid references public.messages (id) on delete set null;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages drop constraint if exists messages_body_or_attachment;
alter table public.messages add constraint messages_body_or_attachment check (
  deleted_at is not null or nullif(btrim(body), '') is not null or attachment_path is not null
);

create or replace function public.validate_message_reply()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reply_conversation_id uuid;
begin
  if new.reply_to_id is null then
    return new;
  end if;
  select conversation_id into reply_conversation_id
  from public.messages
  where id = new.reply_to_id;
  if reply_conversation_id is null or reply_conversation_id <> new.conversation_id then
    raise exception 'Replies must reference a message in the same conversation.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_message_reply() from public, anon, authenticated;
drop trigger if exists validate_message_reply_before_write on public.messages;
create trigger validate_message_reply_before_write
  before insert or update on public.messages
  for each row execute function public.validate_message_reply();

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

create table if not exists public.conversation_typing (
  conversation_id uuid not null,
  user_id uuid not null,
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  foreign key (conversation_id, user_id)
    references public.conversation_participants (conversation_id, user_id)
    on delete cascade
);

alter table public.conversation_typing add column if not exists is_typing boolean not null default false;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_typing enable row level security;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop policy if exists "Conversation members can read their conversations" on public.conversations;
create policy "Conversation members can read their conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));

drop policy if exists "Conversation members can read participants" on public.conversation_participants;
create policy "Conversation members can read participants"
  on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Conversation members can read messages" on public.messages;
create policy "Conversation members can read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Members can send messages as themselves" on public.messages;
create policy "Members can send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "Conversation members can read typing status" on public.conversation_typing;
create policy "Conversation members can read typing status"
  on public.conversation_typing for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create or replace function public.create_conversation(
  p_participant_ids uuid[],
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  invited_ids uuid[];
  new_conversation_id uuid;
  participant_id uuid;
begin
  if viewer_id is null then
    raise exception 'Log in to start a conversation.';
  end if;

  if p_participant_ids is null or cardinality(p_participant_ids) = 0 then
    raise exception 'Choose at least one person to message.';
  end if;
  if array_position(p_participant_ids, null) is not null or viewer_id = any(p_participant_ids) then
    raise exception 'Choose other community members to message.';
  end if;

  select array_agg(distinct member_id order by member_id)
  into invited_ids
  from unnest(p_participant_ids) as invite(member_id);

  if cardinality(invited_ids) > 20 then
    raise exception 'A conversation can include up to 20 invited people.';
  end if;

  foreach participant_id in array invited_ids loop
    if not exists (
      select 1 from public.user_follows uf
      where uf.follower_id = participant_id
        and uf.following_id = viewer_id
    ) then
      raise exception 'Every person you invite must follow you.';
    end if;
  end loop;

  insert into public.conversations (conversation_type, title, created_by)
  values (
    case when cardinality(invited_ids) = 1 then 'direct' else 'group' end,
    case
      when cardinality(invited_ids) > 1 then nullif(left(btrim(coalesce(p_title, '')), 80), '')
      else null
    end,
    viewer_id
  )
  returning id into new_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (new_conversation_id, viewer_id);

  insert into public.conversation_participants (conversation_id, user_id)
  select new_conversation_id, invited_id from unnest(invited_ids) as invite(invited_id);

  return new_conversation_id;
end;
$$;

revoke all on function public.create_conversation(uuid[], text) from public, anon;
grant execute on function public.create_conversation(uuid[], text) to authenticated;

create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid,
  conversation_type text,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  participants jsonb,
  last_message_id uuid,
  last_message_body text,
  last_message_attachment_path text,
  last_message_sender_id uuid,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Log in to view your messages.';
  end if;

  return query
    select
      c.id,
      c.conversation_type,
      c.title,
      c.created_at,
      c.updated_at,
      (
        select jsonb_agg(jsonb_build_object(
          'id', pr.id,
          'full_name', pr.full_name,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'last_read_at', cp.last_read_at
        ) order by cp.joined_at, pr.id)
        from public.conversation_participants cp
        join public.profiles pr on pr.id = cp.user_id
        where cp.conversation_id = c.id
      ),
      latest.id,
      case when latest.deleted_at is not null then 'Message deleted' else latest.body end,
      latest.attachment_path,
      latest.sender_id,
      latest.created_at,
      (
        select count(*)
        from public.messages unread_message
        where unread_message.conversation_id = c.id
          and unread_message.sender_id <> viewer_id
          and unread_message.created_at > cp_self.last_read_at
      )
    from public.conversation_participants cp_self
    join public.conversations c on c.id = cp_self.conversation_id
    left join lateral (
      select m.id, m.body, m.attachment_path, m.sender_id, m.created_at, m.deleted_at
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc, m.id desc
      limit 1
    ) latest on true
    where cp_self.user_id = viewer_id
    order by c.updated_at desc, c.id;
end;
$$;

revoke all on function public.get_my_conversations() from public, anon;
grant execute on function public.get_my_conversations() to authenticated;

drop function if exists public.get_conversation_messages(uuid, timestamptz, integer);
create function public.get_conversation_messages(
  p_conversation_id uuid,
  p_before timestamptz default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_full_name text,
  sender_username text,
  sender_avatar_url text,
  body text,
  attachment_path text,
  created_at timestamptz,
  reply_to_id uuid,
  reply_body text,
  reply_sender_name text,
  edited_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_conversation_participant(p_conversation_id) then
    raise exception 'You are not a participant in this conversation.';
  end if;

  return query
    select selected.id, selected.conversation_id, selected.sender_id,
      selected.full_name, selected.username, selected.avatar_url,
      selected.body, selected.attachment_path, selected.created_at,
      selected.reply_to_id, selected.reply_body, selected.reply_sender_name,
      selected.edited_at, selected.deleted_at
    from (
      select m.id, m.conversation_id, m.sender_id, pr.full_name, pr.username,
        pr.avatar_url, m.body, m.attachment_path, m.created_at, m.reply_to_id,
        case when parent.deleted_at is not null then 'Message deleted' else parent.body end as reply_body,
        parent_profile.full_name as reply_sender_name,
        m.edited_at, m.deleted_at
      from public.messages m
      join public.profiles pr on pr.id = m.sender_id
      left join public.messages parent on parent.id = m.reply_to_id
      left join public.profiles parent_profile on parent_profile.id = parent.sender_id
      where m.conversation_id = p_conversation_id
        and (p_before is null or m.created_at < p_before)
      order by m.created_at desc, m.id desc
      limit greatest(1, least(coalesce(p_limit, 100), 100))
    ) selected
    order by selected.created_at, selected.id;
end;
$$;

revoke all on function public.get_conversation_messages(uuid, timestamptz, integer) from public, anon;
grant execute on function public.get_conversation_messages(uuid, timestamptz, integer) to authenticated;

-- Job listings are public to browse; creating and managing them requires the
-- signed-in account that owns the listing. Application contact details are
-- visible only to the applicant and the owner of the related job.
create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  company text not null check (char_length(btrim(company)) between 2 and 100),
  location text not null check (char_length(btrim(location)) between 2 and 100),
  employment_type text not null
    check (employment_type in ('Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance')),
  workplace_type text not null
    check (workplace_type in ('On-site', 'Hybrid', 'Remote')),
  salary text not null default '' check (char_length(salary) <= 100),
  description text not null check (char_length(btrim(description)) between 20 and 5000),
  requirements text not null default '' check (char_length(requirements) <= 3000),
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.job_listings add column if not exists expires_at timestamptz;

create index if not exists job_listings_active_created_idx
  on public.job_listings (created_at desc)
  where status = 'active';
create index if not exists job_listings_owner_created_idx
  on public.job_listings (owner_id, created_at desc);

alter table public.job_listings enable row level security;
drop policy if exists "Anyone can browse active job listings" on public.job_listings;
create policy "Anyone can browse active job listings"
  on public.job_listings for select
  to anon, authenticated
  using (
    (status = 'active' and (expires_at is null or expires_at > now()))
    or auth.uid() = owner_id
  );
drop policy if exists "Signed-in users can create their own job listings" on public.job_listings;
revoke insert on public.job_listings from anon, authenticated;
drop policy if exists "Owners can update their own job listings" on public.job_listings;
create policy "Owners can update their own job listings"
  on public.job_listings for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and (status = 'closed' or expires_at is null or expires_at > now())
  );
revoke insert, update on public.job_listings from public, anon, authenticated;
grant select on public.job_listings to anon, authenticated;
grant insert on public.job_listings to service_role;
grant update (status) on public.job_listings to authenticated;

create table if not exists public.job_payment_orders (
  order_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  company text not null,
  location text not null,
  employment_type text not null
    check (employment_type in ('Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance')),
  workplace_type text not null
    check (workplace_type in ('On-site', 'Hybrid', 'Remote')),
  salary text not null default '',
  description text not null,
  requirements text not null default '',
  days integer not null check (days between 1 and 365),
  amount_paise integer not null check (amount_paise = days * 1000),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  payment_id text unique,
  job_id uuid references public.job_listings (id) on delete set null,
  renewal_job_id uuid,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.job_payment_orders
  add column if not exists renewal_job_id uuid;

alter table public.job_payment_orders enable row level security;
revoke all on public.job_payment_orders from public, anon, authenticated;
grant select, insert, update on public.job_payment_orders to service_role;

create or replace function public.complete_job_payment(p_order_id text, p_payment_id text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_row public.job_payment_orders%rowtype;
  completed_job_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the payment service can complete job payments.';
  end if;

  select * into payment_row
  from public.job_payment_orders
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Payment order was not found.';
  end if;

  if payment_row.status = 'paid' then
    if payment_row.payment_id <> p_payment_id or payment_row.job_id is null then
      raise exception 'Payment order has already been completed.';
    end if;
    return payment_row.job_id;
  end if;

  if payment_row.renewal_job_id is not null then
    update public.job_listings
    set expires_at = greatest(coalesce(expires_at, now()), now())
          + (payment_row.days || ' days')::interval,
        status = 'active'
    where id = payment_row.renewal_job_id
      and owner_id = payment_row.user_id
    returning id into completed_job_id;

    if completed_job_id is null then
      raise exception 'This job listing can no longer be renewed.';
    end if;
  else
    insert into public.job_listings (
      owner_id, title, company, location, employment_type, workplace_type,
      salary, description, requirements, status, expires_at
    ) values (
      payment_row.user_id, payment_row.title, payment_row.company, payment_row.location,
      payment_row.employment_type, payment_row.workplace_type, payment_row.salary,
      payment_row.description, payment_row.requirements, 'active',
      now() + (payment_row.days || ' days')::interval
    )
    returning id into completed_job_id;
  end if;

  update public.job_payment_orders
  set status = 'paid', payment_id = p_payment_id, job_id = completed_job_id, paid_at = now()
  where order_id = p_order_id;

  return completed_job_id;
end;
$$;

revoke all on function public.complete_job_payment(text, text) from public, anon, authenticated;
grant execute on function public.complete_job_payment(text, text) to service_role;

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_listings (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  applicant_name text not null check (char_length(btrim(applicant_name)) between 2 and 100),
  applicant_email text not null check (char_length(btrim(applicant_email)) between 3 and 254),
  applicant_phone text not null check (char_length(btrim(applicant_phone)) between 5 and 30),
  cover_letter text not null default '' check (char_length(cover_letter) <= 3000),
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index if not exists job_applications_job_created_idx
  on public.job_applications (job_id, created_at desc);
create index if not exists job_applications_applicant_created_idx
  on public.job_applications (applicant_id, created_at desc);

alter table public.job_applications enable row level security;
drop policy if exists "Applicants and job owners can view applications" on public.job_applications;
create policy "Applicants and job owners can view applications"
  on public.job_applications for select
  to authenticated
  using (
    auth.uid() = applicant_id
    or exists (
      select 1
      from public.job_listings listing
      where listing.id = job_id and listing.owner_id = auth.uid()
    )
  );
drop policy if exists "Signed-in users can apply to active jobs" on public.job_applications;
create policy "Signed-in users can apply to active jobs"
  on public.job_applications for insert
  to authenticated
  with check (
    auth.uid() = applicant_id
    and exists (
      select 1
      from public.job_listings listing
      where listing.id = job_id
        and listing.status = 'active'
        and (listing.expires_at is null or listing.expires_at > now())
        and listing.owner_id <> auth.uid()
    )
  );
grant select, insert on public.job_applications to authenticated;

create or replace function public.edit_conversation_message(
  p_message_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  message_row public.messages%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Log in to edit a message.';
  end if;
  select * into message_row
  from public.messages
  where id = p_message_id
  for update;
  if not found or message_row.sender_id <> auth.uid()
    or not public.is_conversation_participant(message_row.conversation_id) then
    raise exception 'You can only edit your own messages.';
  end if;
  if message_row.deleted_at is not null then
    raise exception 'Deleted messages cannot be edited.';
  end if;
  if char_length(coalesce(p_body, '')) > 4000 then
    raise exception 'Messages must be 4000 characters or fewer.';
  end if;
  if nullif(btrim(coalesce(p_body, '')), '') is null and message_row.attachment_path is null then
    raise exception 'A message cannot be empty.';
  end if;

  update public.messages
  set body = coalesce(p_body, ''), edited_at = now()
  where id = p_message_id;
end;
$$;

revoke all on function public.edit_conversation_message(uuid, text) from public, anon;
grant execute on function public.edit_conversation_message(uuid, text) to authenticated;

create or replace function public.delete_conversation_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  message_row public.messages%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Log in to delete a message.';
  end if;
  select * into message_row
  from public.messages
  where id = p_message_id
  for update;
  if not found or message_row.sender_id <> auth.uid()
    or not public.is_conversation_participant(message_row.conversation_id) then
    raise exception 'You can only delete your own messages.';
  end if;
  if message_row.deleted_at is null then
    update public.messages
    set body = '', deleted_at = now()
    where id = p_message_id;
  end if;
end;
$$;

revoke all on function public.delete_conversation_message(uuid) from public, anon;
grant execute on function public.delete_conversation_message(uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Log in to update read receipts.';
  end if;
  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
  if not found then
    raise exception 'You are not a participant in this conversation.';
  end if;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.set_conversation_typing(
  p_conversation_id uuid,
  p_is_typing boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_conversation_participant(p_conversation_id) then
    raise exception 'You are not a participant in this conversation.';
  end if;

  insert into public.conversation_typing (conversation_id, user_id, is_typing, updated_at)
  values (p_conversation_id, auth.uid(), coalesce(p_is_typing, false), now())
  on conflict (conversation_id, user_id)
  do update set is_typing = excluded.is_typing, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.set_conversation_typing(uuid, boolean) from public, anon;
grant execute on function public.set_conversation_typing(uuid, boolean) to authenticated;

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.conversations
  set updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

revoke all on function public.touch_conversation_on_message() from public, anon, authenticated;
drop trigger if exists touch_conversation_after_message on public.messages;
create trigger touch_conversation_after_message
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_chat_attachment(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  conversation_folder text;
begin
  conversation_folder := (storage.foldername(p_object_name))[1];
  if conversation_folder is null then
    return false;
  end if;
  return public.is_conversation_participant(conversation_folder::uuid);
exception
  when invalid_text_representation then
    return false;
end;
$$;

revoke all on function public.can_access_chat_attachment(text) from public, anon;
grant execute on function public.can_access_chat_attachment(text) to authenticated;

drop policy if exists "Conversation members can view chat attachments" on storage.objects;
create policy "Conversation members can view chat attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment(name)
  );

drop policy if exists "Conversation members can upload chat attachments" on storage.objects;
create policy "Conversation members can upload chat attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment(name)
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

drop policy if exists "Conversation members can update chat attachments" on storage.objects;
create policy "Conversation members can update chat attachments"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment(name)
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment(name)
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

drop policy if exists "Conversation members can delete chat attachments" on storage.objects;
create policy "Conversation members can delete chat attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment(name)
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

grant select on public.conversations to authenticated;
grant select on public.conversation_participants to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.conversation_typing to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
    ) then
      alter publication supabase_realtime add table public.conversation_participants;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_typing'
    ) then
      alter publication supabase_realtime add table public.conversation_typing;
    end if;
  end if;
end;
$$;

-- Marketplace listings keep the lister's profile private unless they opt in
-- per listing. Public visitors can browse active listings and their photos.
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  listing_type text not null default 'sell'
    check (listing_type in ('sell', 'rent', 'exchange', 'service')),
  title text not null check (char_length(btrim(title)) between 3 and 90),
  description text not null check (char_length(btrim(description)) between 5 and 1200),
  price numeric(12, 2) not null check (price >= 0),
  is_negotiable boolean not null default false,
  condition text check (condition in ('New', 'Like new', 'Good', 'Fair')),
  locality text not null,
  image_urls text[] not null check (cardinality(image_urls) between 1 and 8),
  show_seller_profile boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'sold', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_listings_active_created_idx
  on public.marketplace_listings (created_at desc)
  where status = 'active';
create index if not exists marketplace_listings_owner_created_idx
  on public.marketplace_listings (owner_id, created_at desc);

alter table public.marketplace_listings enable row level security;
drop policy if exists "Anyone can browse active marketplace listings" on public.marketplace_listings;
create policy "Anyone can browse active marketplace listings"
  on public.marketplace_listings for select
  to anon, authenticated
  using (status = 'active' or auth.uid() = owner_id);
drop policy if exists "Signed-in users can create their own marketplace listings" on public.marketplace_listings;
create policy "Signed-in users can create their own marketplace listings"
  on public.marketplace_listings for insert
  to authenticated
  with check (auth.uid() = owner_id and status = 'active');
drop policy if exists "Users can update their own marketplace listings" on public.marketplace_listings;
create policy "Users can update their own marketplace listings"
  on public.marketplace_listings for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
drop policy if exists "Users can delete their own marketplace listings" on public.marketplace_listings;
create policy "Users can delete their own marketplace listings"
  on public.marketplace_listings for delete
  to authenticated
  using (auth.uid() = owner_id);

grant select on public.marketplace_listings to anon, authenticated;
grant insert, update, delete on public.marketplace_listings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketplace-images',
  'marketplace-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view marketplace images" on storage.objects;
create policy "Public can view marketplace images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'marketplace-images');
drop policy if exists "Signed-in users can upload their marketplace images" on storage.objects;
create policy "Signed-in users can upload their marketplace images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'marketplace-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
drop policy if exists "Users can delete their marketplace images" on storage.objects;
create policy "Users can delete their marketplace images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'marketplace-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create table if not exists public.marketplace_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.marketplace_favorites enable row level security;
drop policy if exists "Users can read their marketplace favorites" on public.marketplace_favorites;
create policy "Users can read their marketplace favorites"
  on public.marketplace_favorites for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can save marketplace listings" on public.marketplace_favorites;
create policy "Users can save marketplace listings"
  on public.marketplace_favorites for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can remove their marketplace favorites" on public.marketplace_favorites;
create policy "Users can remove their marketplace favorites"
  on public.marketplace_favorites for delete to authenticated
  using (auth.uid() = user_id);
grant select, insert, delete on public.marketplace_favorites to authenticated;

alter table public.conversations
  add column if not exists marketplace_listing_id uuid
  references public.marketplace_listings (id) on delete set null;

create or replace function public.get_marketplace_public_seller(p_listing_id uuid)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.full_name, p.username, p.avatar_url
  from public.marketplace_listings l
  join public.profiles p on p.id = l.owner_id
  where l.id = p_listing_id
    and l.status = 'active'
    and l.show_seller_profile = true;
$$;
revoke all on function public.get_marketplace_public_seller(uuid) from public;
grant execute on function public.get_marketplace_public_seller(uuid) to anon, authenticated;

create or replace function public.start_marketplace_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  listing_owner_id uuid;
  listing_title text;
  new_conversation_id uuid;
begin
  if viewer_id is null then
    raise exception 'Log in to chat with a seller.';
  end if;

  select owner_id, title
  into listing_owner_id, listing_title
  from public.marketplace_listings
  where id = p_listing_id and status = 'active';

  if listing_owner_id is null then
    raise exception 'This listing is no longer available.';
  end if;
  if viewer_id = listing_owner_id then
    raise exception 'You cannot start a buyer conversation on your own listing.';
  end if;

  select c.id into new_conversation_id
  from public.conversations c
  where c.marketplace_listing_id = p_listing_id
    and c.conversation_type = 'direct'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = c.id and cp.user_id = viewer_id
    )
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = c.id and cp.user_id = listing_owner_id
    )
    and (
      select count(*) from public.conversation_participants cp
      where cp.conversation_id = c.id
    ) = 2
  limit 1;

  if new_conversation_id is not null then
    return new_conversation_id;
  end if;

  insert into public.conversations (conversation_type, created_by, marketplace_listing_id)
  values ('direct', viewer_id, p_listing_id)
  returning id into new_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (new_conversation_id, viewer_id),
    (new_conversation_id, listing_owner_id);

  insert into public.messages (conversation_id, sender_id, body)
  values (
    new_conversation_id,
    viewer_id,
    'Hi, I''m interested in: ' || listing_title
  );

  return new_conversation_id;
end;
$$;
revoke all on function public.start_marketplace_conversation(uuid) from public, anon;
grant execute on function public.start_marketplace_conversation(uuid) to authenticated;

-- Marketplace chats keep the lister anonymous to buyers unless the lister
-- explicitly exposed their profile on that listing.
create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid,
  conversation_type text,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  participants jsonb,
  last_message_id uuid,
  last_message_body text,
  last_message_attachment_path text,
  last_message_sender_id uuid,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Log in to view your messages.';
  end if;

  return query
    select
      c.id,
      c.conversation_type,
      c.title,
      c.created_at,
      c.updated_at,
      (
        select jsonb_agg(jsonb_build_object(
          'id', pr.id,
          'full_name', case
            when c.marketplace_listing_id is not null
              and cp.user_id <> viewer_id
              and cp.user_id = marketplace.owner_id
              and not marketplace.show_seller_profile
            then 'Marketplace seller'
            else pr.full_name
          end,
          'username', case
            when c.marketplace_listing_id is not null
              and cp.user_id <> viewer_id
              and cp.user_id = marketplace.owner_id
              and not marketplace.show_seller_profile
            then ''
            else pr.username
          end,
          'avatar_url', case
            when c.marketplace_listing_id is not null
              and cp.user_id <> viewer_id
              and cp.user_id = marketplace.owner_id
              and not marketplace.show_seller_profile
            then null
            else pr.avatar_url
          end,
          'last_read_at', cp.last_read_at
        ) order by cp.joined_at, pr.id)
        from public.conversation_participants cp
        join public.profiles pr on pr.id = cp.user_id
        where cp.conversation_id = c.id
      ),
      latest.id,
      case when latest.deleted_at is not null then 'Message deleted' else latest.body end,
      latest.attachment_path,
      latest.sender_id,
      latest.created_at,
      (
        select count(*)
        from public.messages unread_message
        where unread_message.conversation_id = c.id
          and unread_message.sender_id <> viewer_id
          and unread_message.created_at > cp_self.last_read_at
      )
    from public.conversation_participants cp_self
    join public.conversations c on c.id = cp_self.conversation_id
    left join public.marketplace_listings marketplace on marketplace.id = c.marketplace_listing_id
    left join lateral (
      select m.id, m.body, m.attachment_path, m.sender_id, m.created_at, m.deleted_at
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc, m.id desc
      limit 1
    ) latest on true
    where cp_self.user_id = viewer_id
    order by c.updated_at desc, c.id;
end;
$$;
revoke all on function public.get_my_conversations() from public, anon;
grant execute on function public.get_my_conversations() to authenticated;

create or replace function public.get_conversation_messages(
  p_conversation_id uuid,
  p_before timestamptz default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_full_name text,
  sender_username text,
  sender_avatar_url text,
  body text,
  attachment_path text,
  created_at timestamptz,
  reply_to_id uuid,
  reply_body text,
  reply_sender_name text,
  edited_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_conversation_participant(p_conversation_id) then
    raise exception 'You are not a participant in this conversation.';
  end if;

  return query
    select selected.id, selected.conversation_id, selected.sender_id,
      selected.full_name, selected.username, selected.avatar_url,
      selected.body, selected.attachment_path, selected.created_at,
      selected.reply_to_id, selected.reply_body, selected.reply_sender_name,
      selected.edited_at, selected.deleted_at
    from (
      select m.id, m.conversation_id, m.sender_id,
        case when exists (
          select 1
          from public.conversations chat
          join public.marketplace_listings listing on listing.id = chat.marketplace_listing_id
          where chat.id = p_conversation_id
            and listing.owner_id = m.sender_id
            and listing.owner_id <> auth.uid()
            and not listing.show_seller_profile
        ) then 'Marketplace seller' else profile.full_name end as full_name,
        case when exists (
          select 1
          from public.conversations chat
          join public.marketplace_listings listing on listing.id = chat.marketplace_listing_id
          where chat.id = p_conversation_id
            and listing.owner_id = m.sender_id
            and listing.owner_id <> auth.uid()
            and not listing.show_seller_profile
        ) then '' else profile.username end as username,
        case when exists (
          select 1
          from public.conversations chat
          join public.marketplace_listings listing on listing.id = chat.marketplace_listing_id
          where chat.id = p_conversation_id
            and listing.owner_id = m.sender_id
            and listing.owner_id <> auth.uid()
            and not listing.show_seller_profile
        ) then null::text else profile.avatar_url end as avatar_url,
        m.body, m.attachment_path, m.created_at, m.reply_to_id,
        case when parent.deleted_at is not null then 'Message deleted' else parent.body end as reply_body,
        case when exists (
          select 1
          from public.conversations chat
          join public.marketplace_listings listing on listing.id = chat.marketplace_listing_id
          where chat.id = p_conversation_id
            and listing.owner_id = parent.sender_id
            and listing.owner_id <> auth.uid()
            and not listing.show_seller_profile
        ) then 'Marketplace seller' else parent_profile.full_name end as reply_sender_name,
        m.edited_at, m.deleted_at
      from public.messages m
      join public.profiles profile on profile.id = m.sender_id
      left join public.messages parent on parent.id = m.reply_to_id
      left join public.profiles parent_profile on parent_profile.id = parent.sender_id
      where m.conversation_id = p_conversation_id
        and (p_before is null or m.created_at < p_before)
      order by m.created_at desc, m.id desc
      limit greatest(1, least(coalesce(p_limit, 100), 100))
    ) selected
    order by selected.created_at, selected.id;
end;
$$;
revoke all on function public.get_conversation_messages(uuid, timestamptz, integer) from public, anon;
grant execute on function public.get_conversation_messages(uuid, timestamptz, integer) to authenticated;
