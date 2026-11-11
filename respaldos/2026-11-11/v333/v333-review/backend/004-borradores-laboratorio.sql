-- Esquema exclusivo del laboratorio. El servidor local es su único consumidor.
create schema hys318_lab;
revoke all on schema hys318_lab from public, anon, authenticated;
create table hys318_lab.borradores (
  actor uuid not null references public.perfiles(usuario_id),
  id text not null,
  revision integer not null check (revision > 0),
  payload jsonb not null,
  actualizado timestamptz not null default clock_timestamp(),
  primary key (actor, id)
);
alter table hys318_lab.borradores enable row level security;
revoke all on hys318_lab.borradores from public, anon, authenticated;
