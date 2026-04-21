-- Keep black badge support while aligning to current color list.
alter table public.user_marks drop constraint if exists user_marks_badge_check;
alter table public.user_marks
  add constraint user_marks_badge_check check (
    badge is null or badge in ('blue', 'purple', 'pink', 'red', 'green', 'yellow', 'orange', 'black')
  );
