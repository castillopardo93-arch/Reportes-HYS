-- SOLO base de desarrollo, previa exportación.
begin;
drop function public.hys317_evidencia(uuid,text,text,uuid,text,text,text,text,text);
-- Conservar los bytes y su clasificación al retirar la nueva RPC.
-- Las columnas adicionales son compatibles con las RPC anteriores.
commit;
