alter table hys318_lab.borradores
  add column operacion_cierre uuid,
  add constraint operacion_requiere_cierre
    check (operacion_cierre is null or cerrado is not null);
