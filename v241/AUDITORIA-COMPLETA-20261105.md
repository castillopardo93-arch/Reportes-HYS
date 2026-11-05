# Revisión de código y funcionamiento de Reportes HYS v241

Fecha: 5 de noviembre de 2026, America/Santiago. Aplicación revisada: https://reportes-hys-v241-revision.freshfennel.chatgpt.site/.

**Dictamen: requiere correcciones antes de considerarla estabilizada.** La regresión existente pasa, pero cinco defectos adicionales están confirmados. Esta entrega es diagnóstico: no modifica runtime, migraciones instaladas, funciones desplegadas, usuarios ni informes reales.

## Hallazgos por prioridad

### A1 · Alta — Un perfil de solo lectura puede cambiar el flujo de revisión

Archivo: supabase/seguridad-operativa-v241.sql, función hys241_revisar, líneas 120–138; operaciones-v241.js, construcción de transitions.

La función permite enviar un informe propio finalizado sin comprobar permiso efectivo de edición. La interfaz también ofrece Enviar a revisión al propietario por identidad/estado, aunque sea de solo lectura. Se guardó un informe sintético, se revocó editar en permisos_usuario local y se verificó puede_editar=false en hys241_contexto: enviar todavía creó estado Enviado, tanto en APR como OTROS. Cambia estado y añade historial desde un acceso que debía ser de solo lectura. La escritura de contenido por guardar_con_motivo sí tiene defensas; el problema es la ruta independiente de revisión.

Aceptación de corrección: enviar/corregir deben validar permiso de escritura actual en servidor y ocultarse o deshabilitarse en interfaz cuando falte. Mantener las facultades explícitas de aprobar/devolver/cerrar separadas, sin autoaprobación. Probar revocación entre renderizado y envío.

### A2 · Alta — Caché de informes puede cruzar usuarios al cambiar sesión

Archivo: index.html, método Hys241Bridge.cacheArchive, línea 846. Invocado desde cloud-v241.js fetchReport/cacheSummary/cacheFinalized.

cacheArchive espera readLocalArchivedReport241 y después abre otra base a través de openArchiveDB, cuya clave utiliza el ámbito global vigente. No captura ni revalida usuario/módulo/generación entre ambas operaciones. Reproducción con el método real, pausando esa lectura: llamada iniciada por usuario A; cambio a B; al continuar, reportData de A se escribe en la base de B. Comprobaciones externas posteriores pueden rechazar la respuesta, pero llegan después de esa escritura. Es un defecto de aislamiento local; no demuestra que las RLS de Supabase hayan filtrado datos.

Aceptación: capturar ámbito y generación al iniciar; usar un destino de almacenamiento capturado, revalidar después de cada espera y antes de escribir/renderizar. Cubrir descarga, resúmenes, finalización, PDF, cambio de módulo y cierre de sesión con esperas controladas. No eliminar datos locales existentes como arreglo automático.

### A3 · Alta — El nombre administrado en v241 se sustituye por el perfil anterior

Archivos: supabase/base-central-v241.sql, hys241_guardar_informe, líneas 88–120; supabase/seguridad-operativa-v241.sql, hys241_contexto.

hys241_contexto muestra coalesce(cuentas_v241.nombre,perfiles.nombre), pero guardar_informe toma actor de perfiles y fuerza actor.nombre en un informe nuevo no General. Tras cambiar solo el nombre v241 de un usuario sintético, el formulario/contexto usa Nombre nuevo v241 y el informe central guarda u, el nombre original. Si el primer envío ya incluye el PDF con el nombre nuevo, la operación se rechaza como «El PDF no corresponde al informe». Afecta el responsable visible, sincronización y coherencia del PDF. No se está confundiendo el UUID del usuario autenticado: la identidad real se conserva.

Aceptación: una fuente efectiva consistente para el nombre inicial y auditoría, sin reescribir el responsable histórico; PDF y payload idénticos; General conserva edición del nombre. Mantener creador_id y último actor reales e independientes del responsable editable.

### A4 · Alta — El retorno de invitación no abre la creación de contraseña

Archivos: supabase/functions/admin-users-v241/index.ts, redirect; index.html líneas 860–863, 934–935, 1074–1098.

El retorno predeterminado es la raíz del sitio, sin recuperar=1 ni activar=1. El cliente solo detecta una sesión de la URL cuando recoveryMode=true, y solo ofrece alta de contraseña cuando activationMode y SIGNED_IN. La URL configurada por defecto no entra en ninguno de esos caminos. La reproducción comprueba la URL efectiva del código y las condiciones reales del cliente. Las pruebas previas del endpoint sustituyen Auth y no ejercitan el enlace completo del correo. Esto confirma un defecto de integración del retorno; no se envió un correo real para probarlo.

Aceptación: retorno a ruta explícita de activación, comprobación de sesión/tipo de enlace, formulario de contraseña nueva, manejo de expiración y sesión aislada. Verificar además allowlist de retornos y correo de Supabase con una cuenta de prueba autorizada; no modificar contraseñas reales para esta prueba.

### A5 · Media — Una invitación pendiente bloquea corregir sus datos

Archivo: supabase/usuarios-operativos-v241.sql, hys241_preparar_invitacion, líneas 64–72; operaciones-v241.js, pendingInvite.

La preparación guarda una solicitud pendiente antes de llamar al proveedor. Con mismo correo y datos nuevos, tanto reutilizar una solicitud como crear otra se rechaza. Cancelar el formulario limpia solo el estado JavaScript; no existe cancelación/reemplazo/conciliación administrativa en la app. Reproducción SQL: preparar un correo sintético, corregir su nombre y preparar otra solicitud produce «Existe una invitación pendiente con otros datos». Puede dejar sin vía de corrección a una invitación que nunca llegó a enviar correo. No se propone borrar usuarios ni solicitudes como solución.

Aceptación: distinguir preparada, correo enviado, cuenta vinculada y completada; ofrecer reintento/conciliación con revisión y auditoría. Permitir corregir una solicitud no ejecutada de forma segura, sin crear duplicados ni tocar cuentas ajenas. Probar errores de proveedor, marcado y concurrencia.

## Verificaciones que pasaron

| Área | Evidencia y alcance |
|---|---|
| Regresión original | 70 grupos: 11 SQL de facultades, 27 integración PostgreSQL WASM, 23 runtime, 6 endpoint con proveedor sustituido y 3 PDF reales sintéticos. Todos aprobados en esta revisión. No equivalen a 70 pruebas end-to-end en producción. |
| Reproducciones nuevas | test-auditoria-sql-v241.cjs confirma cinco escenarios; test-auditoria-cache-v241.cjs confirma dos. Son **siete reproducciones de fallos**, no siete criterios funcionales aprobados. |
| Publicación | Doce recursos devuelven 200. Once JS/CSS coinciden byte a byte; HTML coincide al retirar únicamente la instrumentación identificada de Cloudflare. No se ignoraron scripts arbitrarios. auditar-publicacion-v241.cjs permite repetirlo. |
| Acceso público | Abre directamente Ingresar a Reportes HYS, sin pantalla de ChatGPT. No se probó contraseña de ningún usuario real. |
| Acceso móvil | Navegador real a 390×844: documento sin desbordamiento horizontal; correo/contraseña 322×48 y botón 322×46; formulario completo visible. Revisión de escritorio 1280×720 correcta. |
| Supabase | 13 tablas v241 con RLS; 0 RPC hys241 ejecutables por anon. Un único General, 7 cuentas Auth, 0 Supervisor real, 0 informes v241, 0 ajustes de cuenta v241 y 0 invitaciones al revisar. |
| Roles y API | Pruebas locales de cuatro roles APR/OTROS; rechazo de cambios ajenos sin motivo, ámbitos, usuarios protegidos, SQL directo y borrado de auditorías. La excepción de solo lectura en revisión se detalla en A1. |
| Guardado y recuperación | Regresión cubre finalización offline, falta de cuota, borradores/colas por usuario, revocación, nuevo ID, reintentos y archivos históricos. Revisión estática de recuperación/conflictos realizada; A2/A3 impiden aprobar integridad completa. |
| Fotos/PDF | Tres PDF sintéticos: 10 páginas APR, 12 OTROS y 4 de texto extenso; imágenes y límites verificados, actividades cortas sin corte. Motor PDF idéntico al protegido. Selección, compresión y vista previa revisadas en código; ampliación y captura móvil autenticadas siguen pendientes. |
| Apariencia | Lista cerrada de colores/iconos/tamaños, texto escapado, sin CSS/HTML ejecutable arbitrario; configuración central requiere General. Quedan rótulos heredados «ADMINISTRADOR GLOBAL» en el panel, de prioridad baja. |
| Protección | 83 archivos de bases anteriores y 86 archivos v238 siguen idénticos mediante sus verificadores. Diez huellas runtime v239 y motor PDF intactos. No se desplegó ninguna corrección durante esta auditoría. |

## Avisos de Supabase y su interpretación

El asesor sigue señalando rls_auto_enable ejecutable por anon, 23 SECURITY DEFINER autenticadas, protección de contraseñas filtradas deshabilitada e invitaciones_v241 sin políticas de cliente. Revisados: las funciones RPC v241 requieren autorización explícita; la tabla de invitaciones tiene denegación por defecto para clientes y acceso de servicio. **El número de avisos no equivale a ese número de vulnerabilidades.** rls_auto_enable es un event_trigger, no se afirmó una explotación por RPC. No se alteraron objetos protegidos para silenciar avisos.

Referencias oficiales del asesor:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Se consultaron logs solo en agregado por fuente, sin exportar contenido personal ni credenciales. Esos conteos no acreditan ausencia de errores end-to-end. No se invocó TRUNCATE, no se cambiaron RLS ni se enviaron invitaciones.

## Límite de la revisión funcional

No hay cuentas de prueba autorizadas para los cuatro roles ni Supervisor real. No se suplantó un usuario mediante JWT, no se tomaron contraseñas ni se crearon perfiles para sortearlo. Por tanto, no se declara probado todo el funcionamiento visual después del login, las dos tarjetas autenticadas, formularios y navegación dentro de ambos módulos a tamaños móviles, correo real o recuperación de sesión de cada rol en navegador. Se revisó su código y se ejecutaron pruebas locales; falta completar esa matriz con cuentas de prueba aisladas autorizadas.

Los informes v239 permanecen en v239: v241 no contiene todavía informes reales. No se puede acreditar una sincronización real completa de informes v241 solo porque sus RPC y tablas estén instaladas.

## Propuesta de corrección y reversión

Conservar v241 y su publicación actual como referencia. Tras aprobación de la siguiente etapa, comprobar numeración libre y crear una nueva rama/copia; corregir A1–A4 primero, A5 después. Mantener apariencia e interfaz, separar modificaciones SQL/endpoint del frontend y probar los siete escenarios como criterios de aceptación correctos, además de la regresión existente y pruebas autenticadas.

No se asigna todavía otra versión ni se aplican cambios remotos por este diagnóstico. Reversión de una futura corrección: volver al runtime anterior sin borrar informes, evidencias, usuarios, auditorías ni solicitudes; mantener originales y respaldo privado. Cualquier cambio de objetos protegidos exige revisión específica.
