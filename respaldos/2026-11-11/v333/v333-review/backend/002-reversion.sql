-- Reversión destructiva SOLO para una base aislada desechable, previa exportación.
begin;
drop function public.hys313_evidencia(uuid,text,text,uuid,text,text,text,text);
drop table hys313_private.evidencias;
commit;
