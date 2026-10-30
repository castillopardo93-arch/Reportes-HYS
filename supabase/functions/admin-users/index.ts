// Supabase Edge Function: admin-users
// Deploy with: supabase functions deploy admin-users
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sesión requerida" }, 401);

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: authData, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sesión inválida" }, 401);

  const callerId = authData.user.id;
  const { data: caller, error: callerError } = await admin.from("perfiles")
    .select("usuario_id,nombre,rol,activo").eq("usuario_id", callerId).maybeSingle();
  if (callerError || !caller || caller.activo !== true) return json({ error: "Perfil no autorizado" }, 403);

  const isGlobal = caller.rol === "administrador_global";
  if (!isGlobal && caller.rol !== "administrador_area") return json({ error: "No tienes permisos de administración" }, 403);

  const { data: callerPerms, error: permsError } = await admin.from("permisos_usuario")
    .select("area_id,modulo,puede_ver,puede_editar").eq("usuario_id", callerId);
  if (permsError) return json({ error: "No se pudieron verificar los permisos" }, 500);

  const manageableModules = isGlobal
    ? ["APR", "OTROS"]
    : (callerPerms || []).filter((p: any) => p.puede_ver && p.puede_editar).map((p: any) => p.modulo).filter((m: string) => m === "APR" || m === "OTROS");
  if (!isGlobal && manageableModules.length === 0) return json({ error: "No tienes un área administrable" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const action = body?.action;

  const targetIsManageable = async (uid: string) => {
    if (isGlobal) return true;
    if (!uid || uid === callerId) return false;
    const { data, error } = await admin.from("permisos_usuario").select("modulo")
      .eq("usuario_id", uid).in("modulo", manageableModules);
    if (error) throw error;
    return !!data?.length;
  };

  if (action === "list") {
    let ids: string[] | null = null;
    if (!isGlobal) {
      const { data, error } = await admin.from("permisos_usuario").select("usuario_id")
        .in("modulo", manageableModules);
      if (error) return json({ error: "No se pudieron consultar los usuarios del área" }, 500);
      ids = [...new Set((data || []).map((x: any) => x.usuario_id))];
      if (!ids.length) return json({ users: [] });
    }
    let query = admin.from("perfiles").select("usuario_id,nombre,rol,activo,creado_en").order("nombre");
    if (ids) query = query.in("usuario_id", ids);
    const { data: users, error } = await query;
    if (error) return json({ error: "No se pudieron cargar los usuarios" }, 500);
    const userIds = (users || []).map((u: any) => u.usuario_id);
    const { data: permissions, error: pError } = userIds.length
      ? await admin.from("permisos_usuario").select("usuario_id,area_id,modulo,puede_ver,puede_editar").in("usuario_id", userIds)
      : { data: [], error: null };
    if (pError) return json({ error: "No se pudieron cargar los permisos" }, 500);
    const filtered = isGlobal ? (users || []) : (users || []).filter((u: any) =>
      (permissions || []).some((p: any) => p.usuario_id === u.usuario_id && manageableModules.includes(p.modulo)));
    return json({ users: filtered.map((u: any) => ({ ...u, permisos: (permissions || []).filter((p: any) => p.usuario_id === u.usuario_id && (isGlobal || manageableModules.includes(p.modulo))) })) });
  }

  const validRoles = ["usuario", "supervisor", "administrador_area"];
  const areaIds: Record<string, string> = {
    APR: "397ca24b-5700-4491-8b37-429e51b8c682",
    OTROS: "38ff7823-7f5c-4e39-abed-6b0f9e8e01e1",
  };
  const requestedModules = Array.isArray(body?.modulos) ? [...new Set(body.modulos)] : [];
  if (requestedModules.some((m: string) => !["APR", "OTROS"].includes(m))) return json({ error: "Módulo inválido" }, 400);
  if (!isGlobal && requestedModules.some((m: string) => !manageableModules.includes(m))) return json({ error: "No puedes asignar permisos fuera de tu área" }, 403);

  if (action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const nombre = String(body.nombre || "").trim();
    const rol = String(body.rol || "usuario");
    if (!email || !nombre || password.length < 8) return json({ error: "Completa nombre, correo y contraseña de al menos 8 caracteres" }, 400);
    if (!validRoles.includes(rol) || (!isGlobal && rol === "administrador_area")) return json({ error: "Rol no permitido" }, 403);
    if (!requestedModules.length) return json({ error: "Asigna al menos un módulo" }, 400);
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError || !created.user) return json({ error: createError?.message || "No se pudo crear la cuenta" }, 400);
    const uid = created.user.id;
    const { error: profileInsertError } = await admin.from("perfiles").insert({ usuario_id: uid, nombre, rol, activo: true });
    if (profileInsertError) {
      await admin.auth.admin.deleteUser(uid);
      return json({ error: "No se pudo guardar el perfil: " + profileInsertError.message }, 500);
    }
    const rows = requestedModules.map((m: string) => ({ usuario_id: uid, area_id: areaIds[m], modulo: m, puede_ver: true, puede_editar: body.puede_editar === true }));
    const { error: insertPermError } = await admin.from("permisos_usuario").insert(rows);
    if (insertPermError) {
      await admin.from("perfiles").delete().eq("usuario_id", uid);
      await admin.auth.admin.deleteUser(uid);
      return json({ error: "No se pudieron guardar los permisos: " + insertPermError.message }, 500);
    }
    return json({ success: true, usuario_id: uid });
  }

  if (action === "update") {
    const uid = String(body.usuario_id || "");
    if (!uid || !(await targetIsManageable(uid))) return json({ error: "Usuario fuera de tu ámbito de administración" }, 403);
    const rol = String(body.rol || "usuario");
    if (!validRoles.includes(rol) || (!isGlobal && rol === "administrador_area")) return json({ error: "Rol no permitido" }, 403);
    const { error: profileUpdateError } = await admin.from("perfiles")
      .update({ nombre: String(body.nombre || "").trim(), rol, activo: body.activo === true })
      .eq("usuario_id", uid);
    if (profileUpdateError) return json({ error: "No se pudo actualizar el perfil" }, 500);
    const { error: deleteError } = await admin.from("permisos_usuario").delete().eq("usuario_id", uid)
      .in("modulo", isGlobal ? ["APR", "OTROS"] : manageableModules);
    if (deleteError) return json({ error: "Perfil actualizado, pero no se pudieron reemplazar los permisos" }, 500);
    const rows = requestedModules.map((m: string) => ({ usuario_id: uid, area_id: areaIds[m], modulo: m, puede_ver: true, puede_editar: body.puede_editar === true }));
    if (rows.length) {
      const { error: insertError } = await admin.from("permisos_usuario").insert(rows);
      if (insertError) return json({ error: "Perfil actualizado, pero falló el guardado de permisos" }, 500);
    }
    return json({ success: true });
  }
  return json({ error: "Acción no reconocida" }, 400);
});
