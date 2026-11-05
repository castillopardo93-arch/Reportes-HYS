# v241 — Integración y seguridad

> Estado posterior: base SQL instalada el 5 de noviembre. Ver [INSTALACION-BASE-20261105.md](INSTALACION-BASE-20261105.md). El informe inferior registra la etapa anterior de código y pruebas locales; no representa el estado remoto actual.

4 de noviembre de 2026. Rama desarrollo/v241, carpeta v241/. Base protegida v239. Sustituye el estado de preparación de la etapa anterior.

**Código integrado y validado localmente; NO instalado, activado ni publicado.** HYS241_DEPLOYMENT_READY=false. No se ejecutó SQL remoto, no se desplegó el endpoint, no se enviaron correos y no se modificaron usuarios, informes ni datos de producción. No existe todavía un enlace web operativo v241.

## Errores confirmados y correcciones

| Problema | Corrección / archivos |
|---|---|
| Facultades sin aplicación completa | Autorización por usuario, módulo y UUID de área en seguridad-operativa-v241.sql, alcances-operativos-v241.sql y usuarios-operativos-v241.sql. RLS, funciones y triggers revalidan las operaciones. |
| Endpoint heredado insuficiente y limitado a origen local | Endpoint independiente supabase/functions/admin-users-v241/index.ts con sesión real, origen explícito, invitaciones idempotentes y cuentas existentes protegidas. Usuarios abre operaciones-v241.js; no usa admin-users-v235. |
| Consulta confundida con edición/descarga | Acciones separadas, resúmenes paginados, carga sin PDF por defecto. Sin SELECT directo de informes para otros roles. consulta-operativa-v241.sql, cloud-v241.js, operaciones-v241.js. |
| Guardado/reintentos podían exponer PDF | Ejecución directa del guardado interno revocada; envoltura valida ámbito incluso en reintentos, motivo y revisión; respuesta sin archivo cuando no hay permiso PDF. |
| Renombrar áreas afectaba ámbitos históricos | UUID calculados por servidor; se conservan si las etiquetas no cambian. No se reescribe el informe histórico. |
| Crear área delegada podía fallar al devolver la fila nueva | RPC validada; ámbito del creador autorizado ampliado solo al área nueva, con auditoría. |
| Conservación de versiones anteriores | Instantáneas inmutables de datos/PDF, descarga histórica autorizada por ámbito actual y de la versión. Archivo bloqueado durante revisión/aprobación/cierre. |
| Guardado sin cambios invalidaba revisión | Sin incremento de versión si contenido y archivo no cambian. |
| Reducir rol podía conservar facultades | Revocación y auditoría al dejar de ser Administrador. Nadie crea otro General. |
| Respuestas o borradores de otra sesión | Espacios y Auth v241 independientes, validación de identidad, descarte de respuestas antiguas, conservación local antes de refrescar permisos. index.html, cloud-v241.js, operaciones-v241.js. |

## Comportamiento y criterios de aceptación

- Interfaz base v239 y dos tarjetas conservadas. Cinta administrativa solo en principal; navegación del módulo arriba en escritorio y abajo en móvil. No se reemplaza por el prototipo.
- Un único Administrador general; Administrador, Supervisor y Usuario. Claves internas compatibles, sin migrar perfiles reales. Sin delegar otro General, modificar la propia cuenta ni administrar otros administradores mediante delegación.
- Facultades independientes por Administrador/módulo/área: consultar, PDF, revisión, aprobar, cerrar, editar ajenos, áreas, usuarios, activación y auditoría. Motivo, revisión optimista e historial consultable por el General.
- cuentas_v241 conserva ajustes locales de nombre/rol/actividad/ámbito sin alterar perfiles/permisos existentes. Una desactivación original sigue vigente. Las futuras invitaciones crean únicamente cuentas nuevas con perfil compartido neutral y rol operativo v241.
- Supervisores existentes conservan facultades heredadas en su ámbito; asignar Supervisor a una cuenta local nueva no concede poderes implícitos.
- Seguimiento: filtros y creadores autorizados, páginas de 20 resúmenes, detalle, fotos, PDF separado, edición, revisión e historial. Usuario consulta sus informes autorizados.
- Flujo explícito: envío, aprobado/devuelto, corregido, cerrado, reapertura excepcional del General con motivo. Sin autoaprobación ni incorporación automática de informes históricos.
- Formularios, responsable, identidad informe/borrador/PDF, guardado local, cola y desconexión conservados. Motor PDF idéntico a v239.
- Catálogos, apariencia, áreas y borradores aislados v241. SQL toma catálogos/apariencia v239 si existen; **no copia ni migra informes históricos**. Los informes v239 permanecen en v239.

## Pruebas realizadas

**70 grupos aprobados**, con datos sintéticos, fuera de producción:

| Prueba | Resultado |
|---|---|
| test-servidor-v241.cjs | 11 grupos SQL: General exclusivo, asignaciones independientes, ámbitos, conflictos, RLS y auditoría. |
| test-integracion-v241.cjs | 27 grupos en PostgreSQL WASM local, con instalación atómica completa: API directa, histórico PDF, flujo, invitación idempotente, Supervisor, reducción de rol y revocaciones. |
| test-runtime-v241.cjs | 23 grupos de código real con almacenamiento aislado: cuatro roles APR/OTROS, lectura, desconexión, cuota llena, sesión, responsable, finalización e identidad. |
| test-edge-v241.cjs | 6 grupos del handler con servicios externos simulados: origen/JWT, rechazo SQL, cuenta existente protegida, nueva invitación y reintento. Sin envío real. |
| test-pdf-v241.cjs | 3 PDF sintéticos: APR 10 páginas, OTROS 12, texto extenso 4; fotos, límites y actividades cortas sin cortes. |

verificar-v241.cjs comprueba diez huellas v239, sintaxis, motor PDF idéntico, ausencia de simuladores y activación bloqueada. Verificadores anteriores comprueban bases protegidas v237/v238. build-v241.cjs genera doce recursos y manifiesto SHA256 sin publicar.

Reproducir con dependencias fijadas por pnpm-lock.yaml y scripts citados. Para paquete completo: preparar-instalacion.cjs y test-integracion-v241.cjs con HYS241_ATOMIC_TEST=1. Nunca ejecutar SQL remoto durante estas pruebas.

## Instalación pendiente, alcance y límites

supabase/instalacion-atomica-v241.sql reúne siete fuentes en una transacción. SHA256: `658ad6d893a3d1b92ae9011d4a2ea7201f28e4f8a5f8fcb929558fe74c8da4a5`.

Agrega trece tablas públicas v241, esquema privado, funciones, políticas y triggers v241. No altera tablas, funciones ni políticas originales. Endpoint nuevo admin-users-v241, aún sin desplegar; requiere orígenes HTTPS exactos, retorno de invitación y secretos solo en servidor. La futura acción de invitar crea un perfil nuevo neutral; no modifica usuarios existentes.

Pendiente antes de considerar operativa la versión:

1. Verificar respaldo completo restaurable de base/Auth/evidencias. Inventario privado y ZIP de código **no equivalen** a ese respaldo.
2. Autorización de la siguiente etapa según la puerta de control del usuario.
3. Compilación Deno, correo real, secretos/orígenes y cuentas de prueba autorizadas. Pruebas locales no equivalen a Auth remoto.
4. Instalar solo objetos v241 aprobados y validar cuatro roles en Supabase real sin modificar perfiles reales.
5. Revisión visual web/móvil, navegación, fotos/ampliación, PDF, sesión y desconexión contra backend instalado. No se declara probada visualmente esta integración en servidor.
6. Alojamiento HTTPS independiente y activación posterior autorizada. No reutilizar identidad del sitio v239.
7. Migración de historial v239, si se solicita, en etapa separada. Ningún informe copiado.

## Protección y reversión

main, aplicación oficial y versiones protegidas intactas. BASE-PROTEGIDA.json registra base v239. Reportes-HYS-v239-protegida-antes-v241.zip respalda código sin datos reales ni credenciales.

Esta etapa no requiere reversión remota. En futura instalación: deshabilitar v241 y devolver acceso a v239, conservando informes, auditorías e invitaciones. No ejecutar DROP ni borrar datos/usuarios automáticamente. No publicar respaldos privados.
