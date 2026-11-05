-- REPORTES HYS · ETAPA F02-F07 · v251 / SOLO FUENTE DE DESARROLLO
-- NO EJECUTAR EN PRODUCCION SIN RESPALDO, APROBACION Y PRUEBAS DE RLS.
-- Depende de perfiles, informes_v242, areas_trabajo_v242 y organigrama_v250
-- de la etapa anterior. No altera el PDF ni el informe original.
BEGIN;

CREATE TABLE IF NOT EXISTS public.hys251_preferencias_aviso (
 usuario_id uuid NOT NULL REFERENCES public.perfiles(usuario_id),
 modulo text NOT NULL CHECK(modulo IN ('APR','OTROS')),
 correo_habilitado boolean NOT NULL DEFAULT false,
 actualizado_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(usuario_id,modulo)
);
ALTER TABLE public.hys251_preferencias_aviso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hys251_preferencias_aviso FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.hys251_avisos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 modulo text NOT NULL CHECK(modulo IN ('APR','OTROS')),
 informe_id text NOT NULL,
 hallazgo_id uuid,
 accion_id text NOT NULL,
 area_id uuid REFERENCES public.areas_trabajo_v242(id),
 destinatario_id uuid NOT NULL REFERENCES public.perfiles(usuario_id),
 tipo text NOT NULL CHECK(tipo IN ('asignacion','reasignacion','reasignacion_anterior','cierre','reapertura','cambio_plazo','recordatorio')),
 canal text NOT NULL CHECK(canal IN ('interno','correo')),
 estado text NOT NULL DEFAULT 'pending' CHECK(estado IN ('pending','sent','failed','viewed','confirmed')),
 clave_idempotencia text NOT NULL UNIQUE CHECK(length(clave_idempotencia) BETWEEN 12 AND 400),
 asunto text NOT NULL CHECK(length(asunto)<=180),
 mensaje text NOT NULL CHECK(length(mensaje)<=2000),
 fecha_compromiso date,
 revision_informe integer NOT NULL CHECK(revision_informe>0),
 intentos integer NOT NULL DEFAULT 0 CHECK(intentos>=0),
 siguiente_intento timestamptz,
 reservado_hasta timestamptz,
 proveedor_id text,
 error_codigo text,
 enviado_en timestamptz,
 visto_en timestamptz,
 confirmado_en timestamptz,
 creado_en timestamptz NOT NULL DEFAULT now(),
 actualizado_en timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT hys251_valid_sent CHECK(estado NOT IN ('sent','viewed','confirmed') OR enviado_en IS NOT NULL),
 CONSTRAINT hys251_valid_view CHECK(estado NOT IN ('viewed','confirmed') OR visto_en IS NOT NULL),
 CONSTRAINT hys251_valid_confirm CHECK(estado<>'confirmed' OR confirmado_en IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS hys251_avisos_usuario_idx ON public.hys251_avisos(destinatario_id,modulo,creado_en DESC);
CREATE INDEX IF NOT EXISTS hys251_avisos_outbox_idx ON public.hys251_avisos(canal,estado,siguiente_intento);
ALTER TABLE public.hys251_avisos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hys251_avisos FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.hys251_auditoria_aviso (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 aviso_id uuid NOT NULL,
 actor_id uuid,
 accion text NOT NULL,
 anterior jsonb NOT NULL,
 nuevo jsonb NOT NULL,
 fecha timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hys251_auditoria_aviso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hys251_auditoria_aviso FROM PUBLIC,anon,authenticated;

-- Diario append-only: siempre conservar estado anterior/nuevo y actor.
CREATE OR REPLACE FUNCTION public.hys251_auditar_aviso()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'Los avisos no se eliminan mediante operaciones ordinarias' USING errcode='42501';
 END IF;
 INSERT INTO public.hys251_auditoria_aviso(aviso_id,actor_id,accion,anterior,nuevo)
 VALUES(NEW.id,auth.uid(),lower(TG_OP),
        CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END,
        to_jsonb(NEW));
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hys251_auditoria_trg ON public.hys251_avisos;
CREATE TRIGGER hys251_auditoria_trg
AFTER INSERT OR UPDATE OR DELETE ON public.hys251_avisos
FOR EACH ROW EXECUTE FUNCTION public.hys251_auditar_aviso();

-- Solo el destinatario, administradores globales, administradores del area con
-- facultad real review/view y supervisores directos dentro de su propia area.
-- La consulta nunca concede permiso para editar informes de otras personas.
CREATE OR REPLACE FUNCTION public.hys251_listar_avisos(p_modulo text, p_max integer DEFAULT 100)
RETURNS SETOF public.hys251_avisos
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF p_modulo NOT IN ('APR','OTROS') OR NOT hys242_private.activo() OR p_max NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION 'Consulta no autorizada' USING errcode='42501';
 END IF;
 RETURN QUERY
 SELECT a.* FROM public.hys251_avisos a
 WHERE a.modulo=p_modulo AND (
    a.destinatario_id=auth.uid()
    OR hys242_private.general_unico()
    OR (
      a.area_id IS NOT NULL
      AND hys242_private.rol()='administrador_area'
      AND EXISTS (
       SELECT 1 FROM public.facultades_v242 f WHERE f.usuario_id=auth.uid()
        AND f.modulo=p_modulo AND a.area_id=ANY(f.areas_ids)
        AND f.facultades->>'view'='true' AND f.facultades->>'review'='true'
      )
    )
    OR (
      a.area_id IS NOT NULL AND hys242_private.rol()='supervisor'
      AND EXISTS(
        SELECT 1 FROM public.organigrama_v250 o WHERE o.modulo=p_modulo
         AND o.area_id=a.area_id AND o.subordinado_id=a.destinatario_id
         AND o.supervisor_id=auth.uid() AND o.activo
         AND hys242_private.modulo(p_modulo)
         AND EXISTS(SELECT 1 FROM public.areas_trabajo_v242 ar WHERE ar.id=o.area_id AND ar.activa AND ar.modulo=p_modulo)
      )
    )
 ) ORDER BY a.creado_en DESC LIMIT p_max;
END;
$$;
REVOKE ALL ON FUNCTION public.hys251_listar_avisos(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hys251_listar_avisos(text,integer) TO authenticated;

-- Acuse de lectura/confirmacion: requiere aviso efectivamente ENVIADO,
-- usuario autenticado y evidencia temporal escrita por PostgreSQL.
CREATE OR REPLACE FUNCTION public.hys251_acusar_aviso(p_aviso uuid,p_confirmar boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE current_row public.hys251_avisos;
BEGIN
 IF NOT hys242_private.activo() OR auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Sesion no autorizada' USING errcode='42501';
 END IF;
 SELECT * INTO current_row FROM public.hys251_avisos WHERE id=p_aviso FOR UPDATE;
 IF NOT FOUND OR current_row.destinatario_id<>auth.uid() THEN
  RAISE EXCEPTION 'Aviso ajeno o inexistente' USING errcode='42501';
 END IF;
 IF current_row.estado NOT IN ('sent','viewed','confirmed') THEN
  RAISE EXCEPTION 'No se puede confirmar un aviso sin entrega registrada' USING errcode='22023';
 END IF;
 IF p_confirmar THEN
  IF current_row.estado='sent' THEN
   RAISE EXCEPTION 'Se requiere primero un acuse de lectura' USING errcode='22023';
  END IF;
  UPDATE public.hys251_avisos SET estado='confirmed',
   confirmado_en=coalesce(confirmado_en,now()),actualizado_en=now()
   WHERE id=p_aviso AND estado<>'confirmed';
 ELSE
  UPDATE public.hys251_avisos SET estado='viewed',
   visto_en=coalesce(visto_en,now()),actualizado_en=now()
   WHERE id=p_aviso AND estado='sent';
 END IF;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hys251_acusar_aviso(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hys251_acusar_aviso(uuid,boolean) TO authenticated;

-- Sólo un proceso backend con clave secreta puede reservar filas enviables.
-- El consumidor debe usar una clave de proveedor idempotente, guardar respuesta
-- del proveedor y devolver el error en caso de fallo. Ningún navegador envía.
CREATE OR REPLACE FUNCTION public.hys251_reservar_correo(p_limite integer DEFAULT 20)
RETURNS SETOF public.hys251_avisos
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Operación exclusiva de servicio' USING errcode='42501';
 END IF;
 IF p_limite NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION 'Limite incorrecto' USING errcode='22023';
 END IF;
 RETURN QUERY
 WITH claim AS (
  SELECT id FROM public.hys251_avisos
  WHERE canal='correo' AND estado IN ('pending','failed') AND intentos<5
   AND (siguiente_intento IS NULL OR siguiente_intento<=now())
   AND (reservado_hasta IS NULL OR reservado_hasta<now())
  ORDER BY creado_en ASC LIMIT p_limite FOR UPDATE SKIP LOCKED
 )
 UPDATE public.hys251_avisos a SET reservado_hasta=now()+interval '5 minutes',
  intentos=a.intentos+1,actualizado_en=now()
 FROM claim WHERE a.id=claim.id RETURNING a.*;
END;
$$;
REVOKE ALL ON FUNCTION public.hys251_reservar_correo(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hys251_reservar_correo(integer) TO service_role;
COMMIT;
-- Conectores después: alta de avisos por webhook/RPC protegido tras guardado
-- real validado, preferencias, correo, job programado y pruebas RLS/E2E.
