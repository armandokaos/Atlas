-- Geo Atlas: per-user star ratings and color tags (run once in Supabase SQL editor)

create table if not exists public.user_marks (
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_id text not null,
  stars smallint null check (stars is null or (stars >= 1 and stars <= 5)),
  badge text null check (badge is null or badge in ('blue', 'green', 'red', 'yellow', 'purple', 'orange')),
  updated_at timestamptz not null default now(),
  primary key (user_id, entity_id)
);

create index if not exists user_marks_user_idx on public.user_marks (user_id);

alter table public.user_marks enable row level security;

create policy "user_marks_select_own" on public.user_marks for select using (auth.uid() = user_id);
create policy "user_marks_insert_own" on public.user_marks for insert with check (auth.uid() = user_id);
create policy "user_marks_update_own" on public.user_marks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_marks_delete_own" on public.user_marks for delete using (auth.uid() = user_id);
