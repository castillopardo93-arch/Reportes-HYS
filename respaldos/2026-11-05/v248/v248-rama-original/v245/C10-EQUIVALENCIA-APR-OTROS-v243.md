# C10 — Revisión de equivalencia APR/OTROS y aislamiento de información

**Fecha:** 2026-11-05 | **Rama:** `desarrollo/v243` | **Estado:** auditoría técnica completada en desarrollo; prueba visual y servidor aislado pendientes. Ninguna publicación oficial autorizada.

## Resultado de arquitectura
- Una sola definición de formulario, datos de Hallazgos, CSS, componentes C03–C09 y generador PDF; OTROS usa el mismo motor dentro de `iframe` con `?embedded=otros` y se identifican sus formularios por `embeddedOtros`.
- APR conserva Actividades HYS, Actividades por área y Hallazgos. En OTROS se ocultan las dos tablas exclusivas de APR.
- La tabla original de Hallazgos mantiene sus siete columnas y las proporciones de C01; fotos, riesgos C03, asignaciones C04, fecha C05, seguimiento C06, corrección C07, acciones C08, reasignación C08-R y auditoría C09 están en la **misma implementación** compartida.
- El paquete OTROS mantiene `activities:[]`, `inspections:[]` y solamente sus `findings` al guardar, sin mezclar registros APR. Los PDF se distinguen por `otros: true` y los títulos originales.
- `storage-v242.js` encapsula datos de informe en `hys-v242::<usuario>::<modulo>::` para localStorage, sessionStorage e IndexedDB. El estado de autenticación `sb-*` es intencionalmente compartido entre ambos módulos, no así los informes.
- La mensajería entre iframe OTROS y padre APR compara tanto `event.origin` como `event.source` para cambios de módulo/cierre de sesión.

## Refuerzo implementado C10
1. Todo **nuevo informe/respaldado** incorpora el campo `module: 'APR'|'OTROS'` dentro del `pack()`, sin cambiar el `version: "v242"` heredado.
2. La función `applyPack` rechaza copias con `module` contrario antes de modificar el informe.
3. Al cargar un objeto en OTROS, se eliminan de la carga las actividades e inspecciones propias de APR, aunque alguien entregase un objeto mixto.
4. Las copias históricas que no contienen `module` siguen abiertas por compatibilidad; esta es una limitación conocida que requiere revisión de contexto antes de importar entre módulos durante la migración.

## Riesgos y pendientes, no ocultarlos
- El aislamiento por usuario/módulo local es **una separación lógica**, no una garantía criptográfica contra personas con acceso al mismo dispositivo, y no sustituye los permisos RLS por proyecto/área en el servidor.
- La rama v243 todavía usa archivos de identidad y APIs heredados de v242. La configuración de desarrollo establece `HYS242_ENABLE_CENTRAL=false` y `HYS242_DEPLOYMENT_READY=false`: **no habilitar estos indicadores para conseguir una demo**.
- Existe una ruta heredada en el inicio de sesión que, cuando `DEPLOYMENT_READY` es falso, presenta ambos módulos a todo perfil activo. Como no existe escritura central en ese estado, no habilita operaciones productivas, pero tampoco representa un modelo válido de autorización. Una revisión pública debe usar datos ficticios sin autenticar contra Supabase.
- El formulario C04 de usuarios reales, las tareas y cierres de C07–C09 todavía necesitan un **backend de ensayo autónomo** y pruebas de permisos con usuarios artificiales; sus operaciones siguen bloqueadas.
- Los respaldos históricos sin módulo, la selección de permisos por área/proyecto y la persistencia remota de evidencias no pueden declararse listos.
- Falta ejecutar la suite nativa `node --test` con todos los archivos del directorio, pruebas E2E reales de navegador, impresión/PDF, pantallas PC/Android/iPhone y roles APR/OTROS.

## Revisión web acordada
El enlace de revisión debe ser un **sitio distinto** de la aplicación oficial, con identificador visual claro de demostración, datos enteramente ficticios, sin SDK ni configuración Supabase real, y sin credenciales de prueba productivas. Debe permitir observar ambos módulos, formularios, tabla, evidencias y PDF; acciones de correo/cierre/reasignación que dependen del backend deben permanecer inhabilitadas. Un enlace a GitHub con el código no sustituye una dirección web funcional.

**Archivos C10:** `index.html`, `test-c10-v243.cjs`, `C10-EQUIVALENCIA-APR-OTROS-v243.md`. No tocar `main`, otras ramas protegidas, la aplicación oficial ni Supabase.
