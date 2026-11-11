# REPORTES HYS — AUDITORÍA INTEGRAL CORRECTIVA · v265

**Fecha:** 2026-11-08  
**Rama auditada y corregida:** `desarrollo/v265-gestion-usuarios-trabajadores`  
**Commit inicial de esta revisión:** `250f8bad097de0880bcb8454bcec8acd927c092e`  
**Alcance:** carpeta `v265-review` (63 archivos al inicio; ~915 KB), código de ambas tarjetas, interfaz general, frontend, datos simulados, gestión de usuarios y conexión potencial con Supabase.  
**Base de control documental:** Lista Maestra adjunta a la conversación (referencia interna v241; secciones B a N, incluida F).  
**Estado:** auditoría de código y simulación; **NO** es certificación funcional de producción ni autorización de despliegue.

## 1. Reglas respetadas

- Todo cambio se efectuó en la **MISMA v265**, según instrucción del usuario. No se creó otra versión.
- `main`, `desarrollo/v264-facultades-desde-cero` y versiones protegidas no se modificaron. Estado inicial de comparación: main `7321ed655f8e14e9b69248562a0a49392164b18a`; v264 `bd959da840f057ce3a1d0c9fcbaa282b2cc83dc2`.
- Se consultó Supabase **solo con operaciones de lectura y asesores**. No se ejecutó DDL, migración, RPC de escritura ni modificación de usuarios, funciones, RLS, Storage o registros de producción.
- La cuenta/invitación real y la gestión central conservan sus bloqueos en `config-v242.js`.
- El modo offline, la migración de producción y el servicio real de correo quedan fuera del alcance autorizado.

## 2. Incidencias corregidas — prioridad y evidencia

| ID | Prioridad | Archivo(s) | Problema localizado | Corrección | Verificación |
|---|---|---|---|---|---|
| AUD-01 | P1 | `storage-v242.js` | El prefijo `hys-v263-laboratorio` de v265 era idéntico al de v264, con potencial de lectura/mezcla de borradores en el mismo origen. | Nuevo espacio `hys-v265-laboratorio`, individual por sesión/tarjeta, sin eliminar almacenamiento antiguo; herramienta de lectura heredada. | Simulación confirma separación y conservación de datos antiguos. |
| AUD-02 | P1 | `cloud-v242.js` | Cola IndexedDB utilizaba nombre v263. | Nuevo `hys-v265-laboratorio-queue` por usuario y tarjeta. No elimina bases anteriores. | Revisión estructural del nombre, acompañada de prueba de prefijos. |
| AUD-03 | P1 | `storage-v242.js`, `backend-simulador-v263.js`, `appearance-v242.js` | Usuarios, áreas, historial y apariencia ficticios estaban almacenados dentro del ámbito de una tarjeta, de modo que cambiar de tarjeta o usuario podía aparentar pérdida de registros. | Almacén **compartido únicamente para la administración ficticia v265 y Apariencia**; informes siguen independientes. Migración conservadora de claves **inequívocamente v265** desde prefijos anteriores, sin borrar copias. | 12 comprobaciones de aislamiento, persistencia transversal y migración. |
| AUD-04 | P1 | `vista-completa-preview-v265.js` | Mock de consultas no devolvía `listas_v242` / `listas_v238` ni auditoría de áreas; los selectores de prueba podían vaciarse. | Incorporar listas, áreas y auditoría ficticia a la consulta simulada. | Pruebas de catálogo y revisión de lógica de consultas. |
| AUD-05 | P1 | `gestion-usuarios-v265.js` | La variable `lab` permitía autorizar Gestión de usuarios independientemente del rol de la sesión ficticia. | Autorizar exclusivamente perfil activo `administrador_global`; el modo de pruebas ya no basta para habilitar el panel. | Revisión de función `isGlobal` y compilación del módulo. |
| AUD-06 | P2 | `worker-model-v265.js` | Las fechas se validaban mediante una expresión regular, aceptando días inexistentes (ej. 31 de febrero). | Comprobación de fecha real por calendario, incluido año bisiesto. | Pruebas positivas/negativas de calendario. |
| AUD-07 | P1 | `worker-model-v265.js` | Solo se prohibía designar a uno mismo como supervisor inmediato; una cadena circular no era detectada. | Detectar autorreferencias y ciclos directos/indirectos de supervisión, incluso durante edición de cuentas migradas. | Pruebas con cadena circular y supervisión directa. |
| AUD-08 | P1 | `worker-model-v265.js`, `backend-simulador-v263.js` | Facultades con nombres inventados, valores no booleanos, áreas duplicadas o sin ámbito suficiente podían no ser rechazadas por todos los caminos del laboratorio. | Lista blanca de facultades, booleanos estrictos, dependencias, áreas únicas, verificación cruzada de RPCs ficticias y validación antes de escribir. | Pruebas de privilegios inválidos, RPC fallida y atomicidad. |
| AUD-09 | P1 | `backend-simulador-v263.js` | El simulador actualizaba el estado en memoria ANTES de confirmar persistencia local; al fallar la cuota podían quedar cambios fantasma. | Escritura duradera antes de cambiar estado; error visible si el navegador no puede guardar. | Fallo simulado de almacenamiento y recuperación. |
| AUD-10 | P2 | `worker-model-v265.js`, `backend-simulador-v263.js` | Datos privados podían filtrarse si se escribían RUT/correo/teléfono como texto libre en el motivo de auditoría. | Redacción de identificadores en campos, cadenas libres y motivos **antes** de guardar la historia ficticia y al representarla. | Verificación de ocultamiento y de integridad del historial. |
| AUD-11 | P2 | `index.html` | Caché de recursos de desarrollo podía servir JS antiguo pese a una corrección. | Versionado de URL en las siete dependencias modificadas; la estructura de ambas tarjetas y formularios no se sustituyó. | 47 scripts embebidos con sintaxis válida y control estático de tarjetas. |

## 3. Evidencias de pruebas realizadas

**Pruebas dinámicas realizadas sobre funciones reales de v265 en simulaciones JavaScript, sin acceso a servidor**:

- 11 comprobaciones de separación de prefijos, conservación heredada, aislamiento IndexedDB, permisos de rol y catálogo.
- 12 comprobaciones de migración selectiva y almacenamiento compartido de administración/Apariencia entre ámbitos.
- 15 comprobaciones de fechas, supervisores, facultades inválidas y rechazo atómico de RPC ficticia.
- 8 comprobaciones del ciclo creación Administrador → degradación Usuario → regreso a Administrador sin recuperar derechos, y de no copia de RUT/correos a historial.
- 4 comprobaciones de fallo de persistencia; se verificó también guardado posterior al recuperar almacenamiento.
- 19 comprobaciones de integridad de pantallas, controles y scripts en la revisión final.
- En los controles correspondientes se analizaron los 47 bloques `script` de `index.html` por sintaxis, incluidos 7 archivos JS corregidos.

**Criterio de lectura:** estas comprobaciones son parciales y algunas validan el mismo requisito desde distintos ángulos. NO son equivalentes a 69 pruebas independientes de extremo a extremo. No sustituyen pruebas reales de DOM, fotos/PDF, dispositivos y Supabase.

**Archivo de pruebas reproducibles agregado:** `evidencias-v265/test-regresion-integral-v265.cjs` (10 casos `node:test`). Fue incorporado al repositorio, pero **no ejecutado con Node en esta sesión**; la infraestructura externa de navegador no estuvo disponible. Los escenarios principales sí se ejercitaron con simulaciones JavaScript independientes.

## 4. Riesgos encontrados que NO se deben corregir unilateralmente

### SEC-01 · Permiso a función privilegiada — P1, validación de seguridad pendiente

El asesor de Supabase informa que `public.rls_auto_enable()` es `SECURITY DEFINER` y tiene `EXECUTE` para el rol `anon`. Se verificó con SQL **SELECT**, sin tocar la función. La rutina devuelve `event_trigger`, por lo que el aviso NO demuestra por sí solo una explotación directa vía RPC; corresponde evaluar revocación de EXECUTE y sus dependencias antes de aplicar. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

### SEC-02 · Otras funciones SECURITY DEFINER — P1, análisis servidor pendiente

El asesor señala varias RPC `SECURITY DEFINER` invocables por usuarios autenticados; muchas incluyen comprobaciones internas explícitas. No se deben revocar todas indiscriminadamente: hay que inspeccionar `auth.uid()`, rol, módulos, ámbitos, `USING`, `WITH CHECK`, `GRANT EXECUTE`, validaciones y casos negativos por función. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

### SEC-03 · Funciones Edge sin verificación JWT de plataforma — P1, evaluación pendiente

Las funciones `admin-users` y `admin-users-v242` están configuradas `verify_jwt=false`. Su código inspeccionado **sí solicita un bearer token y verifica al usuario mediante `auth.getUser`** antes de operar, lo cual evita concluir que estén abiertas sin autenticación. Requieren prueba negativa formal y revisión del diseño de autorización del backend antes de modificar la configuración de JWT.

### SEC-04 · Invitaciones con RLS sin política — informativo

Las tablas `invitaciones_v241` y `invitaciones_v242` tienen RLS habilitado y el asesor indica ausencia de políticas. Puede ser una decisión de cierre por defecto; comprobar que la Edge Function/RPC de invitaciones dispone de permisos controlados. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

### INTEG-01 · Administración real y servicio de invitación — P1

En v265 la ficha laboral, el alta de cuentas y la gestión unificada se guardan **solo en el laboratorio ficticio**. No existe autorización para implementar en esta revisión la migración real de `auth.users`, los datos del trabajador, las invitaciones, RLS y operaciones atómicas. Mantener flags desactivadas.

### INTEG-02 · Notificaciones y etapa F — P1

`notifications-f251.js` documenta explícitamente que F02–F07 son un planificador local, **sin envío ni confirmación real**. Requiere integración y pruebas reales de entregas, errores, reintentos y auditoría, con autorización de servidor. No marcar F como cerrada.

### INTEG-03 · PDF, fotos, cierre de informes y número global — P1

Se conserva el código existente, pero no se realizó verificación de flujo real, impresión, fotografías, duplicación de PDF, paginación, numeración única global ni cierre y recuperación en ambas tarjetas. Evitar cambios de alto riesgo sin una prueba visual y copia recuperable.

### INTEG-04 · Borradores antiguos de v263/v264 — P2

No se importaron automáticamente borradores desde el prefijo antiguo, porque no es posible identificar con seguridad a qué versión pertenecen. Permanecen en el navegador original sin borrarse; se expuso una lectura heredada para recuperación asistida. La migración requiere identificar la fuente y preservar la privacidad.

### INTEG-05 · Modo offline y arquitectura multiproyecto — pendientes por acuerdo

Conservar postergados, sin activar sincronización remota ni mezclar datos de proyectos.

## 5. Estado por letras de la Lista Maestra

- **B01–B05:** inventario y diagnóstico ampliados; auditoría parcial de Supabase en solo lectura. **B06: aprobación del usuario pendiente.**
- **C/D:** formularios y lógica histórica conservados; pruebas de regresión funcional aún pendientes.
- **E01–E05:** mejoras del laboratorio, jerarquía, acceso, auditoría ficticia y validaciones. Persistencia real pendiente.
- **F01–F07:** diseño y funciones locales existentes; no se certifican notificaciones ni cierres reales.
- **G:** funcionamiento offline pendiente según regla del proyecto.
- **H/I:** catálogo/indicadores y pruebas integrales de PDF/informes pendientes.
- **J–N:** decisiones estratégicas conservadas. No se modifican sin evidencia y autorización.

## 6. Criterios de aceptación siguientes (sin crear versión)

1. Abrir **la app completa v265** en navegador y comprobar las dos tarjetas con pantalla de acceso y retorno.
2. Crear y editar usuario ficticio en el proceso de cinco pasos; probar datos incompletos, correos, RUT, supervisor, rol y facultades.
3. Cambiar entre APR/OTROS y verificar que las áreas, usuarios, auditoría y Apariencia ficticios se mantienen compartidos, mientras los borradores de informe no se mezclan.
4. Comprobar banda lateral sin botones duplicados, pestañas independientes, sin barra visual y Apariencia al pie.
5. Hacer prueba de PDF, fotos, guardar/finalizar, recuperación y seguimiento de ambas tarjetas con datos ficticios, en dispositivo de escritorio y móvil.
6. Solo tras autorización expresa: ejecutar pruebas negativas con perfiles reales y evaluar cambios de RLS/Edge Functions; nunca aplicar simultáneamente a producción sin respaldo y migración aprobados.

**Resultado:** varios fallos de integridad y aislamiento corregidos dentro de v265. **La app no se considera certificada o aprobada para producción.** Se solicita validación visual y aceptación del diagnóstico antes de cualquier cambio de infraestructura.
