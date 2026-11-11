create index if not exists borradores_historial_tarjeta
 on hys318_lab.borradores ((payload->>'module'), cerrado desc, id)
 where cerrado is not null;
