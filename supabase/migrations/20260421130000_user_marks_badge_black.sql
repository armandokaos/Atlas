-- Add black color tag to badge check (run after purple/orange migration if needed)
alter table public.user_marks drop constraint if exists user_marks_badge_check;
alter table public.user_marks
  add constraint user_marks_badge_check check (
    badge is null or badge in ('blue', 'green', 'red', 'yellow', 'purple', 'orange', 'black')
  );
