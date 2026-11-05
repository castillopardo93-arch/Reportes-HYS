-- Reportes HYS v250 — ORGANIGRAMA DE RESPONSABILIDAD (NO DESPLEGADO)
-- Solo para revision en la rama desarrollo/v250. No ejecutar sin revisión,
-- respaldo y autorización. No modifica políticas de informes_v242 existentes.
-- Relación DIRECTA por módulo y área (no implica visibilidad transitiva).
BEGIN;
CREATE TABLE IF NOT EXISTS public.organigrama_v250 (
  modulo text NOT NULL CHECK(modulo IN ('APR','OTROS')),
  area_id uuid NOT NULL REFERENCES public.areas_trabajo_v242(id),
  supervisor_id uuid NOT NULL REFERENCES public.perfiles(usuario_id),
  subordinado_id uuid NOT NULL REFERENCES public.perfiles(usuario_id),
  activo boolean NOT NULL DEFAULT true,
  asignado_por uuid NOT NULL REFERENCES public.perfiles(usuario_id),
  motivo text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(modulo,area_id,subordinado_id),
  CHECK(supervisor_id <> subordinado_id),
  CHECK(length(btrim(motivo)) BETWEEN 5 AND 500)
);
ALTER TABLE public.organigrama_v250 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organigrama_v250 FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.organigrama_auditoria_v250 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  modulo text NOT NULL,
  area_id uuid NOT NULL,
  supervisor_id uuid,
  subordinado_id uuid NOT NULL,
  accion text NOT NULL,
  antes jsonb NOT NULL DEFAULT '{}'::jsonb,
  despues jsonb NOT NULL DEFAULT '{}'::jsonb,
  motivo text NOT NULL,
  actor_id uuid NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organigrama_auditoria_v250 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organigrama_auditoria_v250 FROM PUBLIC, anon, authenticated;

-- Lectura segura: general (todo), área (áreas delegadas con view/review),
-- supervisor (solo sus subordinados DIRECTOS, con ámbito APR/OTROS activo).
-- No expone listado completo de usuarios y no otorga acceso a informes.
CREATE OR REPLACE FUNCTION public.hys250_equipo_autorizado(p_modulo text)
RETURNS TABLE(supervisor_id uuid,subordinado_id uuid,modulo text,area_id uuid,area_nombre text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF p_modulo NOT IN ('APR','OTROS') OR NOT hys242_private.activo() THEN
   RAISE EXCEPTION 'No autorizado' USING errcode='42501';
 END IF;
 RETURN QUERY
 SELECT o.supervisor_id,o.subordinado_id,o.modulo,o.area_id,a.nombre
 FROM public.organigrama_v250 o
 JOIN public.areas_trabajo_v242 a ON a.id=o.area_id AND a.modulo=o.modulo AND a.activa
 JOIN public.perfiles s ON s.usuario_id=o.supervisor_id AND s.activo
 JOIN public.perfiles sub ON sub.usuario_id=o.subordinado_id AND sub.activo
 WHERE o.activo AND o.modulo=p_modulo
 AND (
  hys242_private.general_unico()
  OR (
    hys242_private.rol()='administrador_area'
    AND EXISTS(
      SELECT 1 FROM public.facultades_v242 f
      WHERE f.usuario_id=auth.uid() AND f.modulo=p_modulo
        AND o.area_id=ANY(f.areas_ids)
        AND f.facultades->>'view'='true'
        AND f.facultades->>'review'='true'
    )
  )
  OR (
    hys242_private.rol()='supervisor'
    AND o.supervisor_id=auth.uid()
    AND hys242_private.modulo(p_modulo)
  )
 );
END;
$$;
REVOKE ALL ON FUNCTION public.hys250_equipo_autorizado(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hys250_equipo_autorizado(text) TO authenticated;

-- Modificación exclusivamente por el administrador general, con auditoría,
-- un único supervisor directo por persona / módulo / área.
CREATE OR REPLACE FUNCTION public.hys250_asignar_supervision(
 p_modulo text,p_area_id uuid,p_supervisor_id uuid,p_subordinado_id uuid,
 p_activo boolean,p_motivo text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 old_row public.organigrama_v250;
 saved public.organigrama_v250;
BEGIN
 IF NOT hys242_private.general_unico() THEN
  RAISE EXCEPTION 'Solo el administrador general puede gestionar el organigrama' USING errcode='42501';
 END IF;
 IF p_modulo NOT IN ('APR','OTROS') OR p_area_id IS NULL
    OR p_subordinado_id IS NULL OR p_supervisor_id IS NULL OR p_supervisor_id=p_subordinado_id
    OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 5 AND 500 THEN
  RAISE EXCEPTION 'Asignación incompleta o inválida' USING errcode='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.areas_trabajo_v242 a WHERE a.id=p_area_id AND a.modulo=p_modulo AND a.activa)
 OR NOT EXISTS(SELECT 1 FROM public.perfiles s WHERE s.usuario_id=p_supervisor_id AND s.activo AND s.rol IN ('supervisor','administrador_area'))
 OR NOT EXISTS(SELECT 1 FROM public.perfiles sub WHERE sub.usuario_id=p_subordinado_id AND sub.activo)
 THEN RAISE EXCEPTION 'Módulo, área o personas no habilitadas' USING errcode='42501'; END IF;

 -- No permitir que una persona sea simultáneamente superior directa
 -- y subordinada de su subordinado en la misma área.
 IF p_activo IS TRUE AND EXISTS(
   SELECT 1 FROM public.organigrama_v250 o
   WHERE o.modulo=p_modulo AND o.area_id=p_area_id AND o.activo
   AND o.supervisor_id=p_subordinado_id AND o.subordinado_id=p_supervisor_id
 ) THEN RAISE EXCEPTION 'Relación jerárquica circular' USING errcode='22023'; END IF;

 SELECT * INTO old_row FROM public.organigrama_v250 o
 WHERE o.modulo=p_modulo AND o.area_id=p_area_id AND o.subordinado_id=p_subordinado_id FOR UPDATE;

 IF p_activo IS FALSE AND old_row.subordinado_id IS NULL THEN
  RAISE EXCEPTION 'No existe una relación activa para desactivar' USING errcode='22023';
 END IF;
 IF p_activo IS FALSE AND old_row.supervisor_id<>p_supervisor_id THEN
  RAISE EXCEPTION 'La relación indicada no coincide' USING errcode='22023';
 END IF;
 INSERT INTO public.organigrama_v250
  (modulo,area_id,supervisor_id,subordinado_id,activo,asignado_por,motivo)
 VALUES(p_modulo,p_area_id,p_supervisor_id,p_subordinado_id,coalesce(p_activo,false),auth.uid(),p_motivo)
 ON CONFLICT (modulo,area_id,subordinado_id) DO UPDATE SET
  supervisor_id=EXCLUDED.supervisor_id,activo=EXCLUDED.activo,
  asignado_por=EXCLUDED.asignado_por,motivo=EXCLUDED.motivo,actualizado_en=now()
 RETURNING * INTO saved;

 INSERT INTO public.organigrama_auditoria_v250
 (modulo,area_id,supervisor_id,subordinado_id,accion,antes,despues,motivo,actor_id)
 VALUES(p_modulo,p_area_id,p_supervisor_id,p_subordinado_id,
  CASE WHEN p_activo THEN 'asignar' ELSE 'desactivar' END,
  CASE WHEN old_row.subordinado_id IS NULL THEN '{}'::jsonb ELSE to_jsonb(old_row) END,
  to_jsonb(saved),p_motivo,auth.uid());
 RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.hys250_asignar_supervision(text,uuid,uuid,uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hys250_asignar_supervision(text,uuid,uuid,uuid,boolean,text) TO authenticated;
COMMIT;
-- ATENCIÓN: confirmar despliegue y validar RLS/funciones antes de usar la gestión.
-- Esta migración NO autoriza por sí sola a descargar/leer informes ajenos:
-- las consultas de pendientes definitivas deben filtrar en el servidor.
