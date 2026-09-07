drop policy if exists "Users can read their own progress" on public.progress;
drop policy if exists "Users can insert their own progress" on public.progress;
drop policy if exists "Users can update their own progress" on public.progress;

alter table public.progress
alter column user_id type uuid
using user_id::uuid;

alter table public.progress enable row level security;

create policy "Users can read their own progress"
on public.progress for select
using (auth.uid() = user_id);

create policy "Users can insert their own progress"
on public.progress for insert
with check (auth.uid() = user_id);

create policy "Users can update their own progress"
on public.progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);