-- Rename league status values: active→in_progress, upcoming→launching, completed→finished
alter table leagues drop constraint if exists leagues_status_check;

update leagues set status = 'in_progress' where status = 'active';
update leagues set status = 'launching'   where status = 'upcoming';
update leagues set status = 'finished'    where status = 'completed';

alter table leagues alter column status set default 'in_progress';
alter table leagues add constraint leagues_status_check
  check (status in ('launching', 'in_progress', 'finished'));
