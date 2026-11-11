alter table hys318_lab.borradores
  add column cerrado timestamptz,
  add column pdf bytea,
  add column nombre_pdf text,
  add constraint borrador_cierre_completo check (
    (cerrado is null and pdf is null and nombre_pdf is null) or
    (cerrado is not null and pdf is not null and nombre_pdf is not null)
  );
create index borradores_cerrados_actor_fecha
  on hys318_lab.borradores (actor, cerrado desc, id)
  where cerrado is not null;
