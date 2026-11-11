-- Reversión destructiva SOLO para una base aislada desechable, previa exportación.
begin;
drop function public.hys313_investigacion_listar(text,uuid,integer);
drop function public.hys313_investigacion_revisores(text,uuid,text);
drop function public.hys313_investigacion_leer(uuid,text,integer);
drop function public.hys313_investigacion_aplicar(uuid,text,text,integer,text,uuid,jsonb,uuid,text);
drop table hys313_private.historial,hys313_private.documentos,hys313_private.expedientes;
drop function hys313_private.validar(text,jsonb,boolean);
drop function hys313_private.revisor(uuid,text,uuid);
drop function hys313_private.ambito(text,uuid,boolean);
drop schema hys313_private;
commit;
