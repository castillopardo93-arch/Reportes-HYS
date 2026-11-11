# Segunda auditoría integral de Reportes HYS — 07-11-2026

## 1. Base, método y aislamiento

- Base actual identificada en GitHub: `desarrollo/v259`, carpeta `v259-review`, manifiesto versión 259, `activada: false`.
- Auditoría en `desarrollo/auditoria-integral-v259` con copia aislada `v259-audit-lab`. NO se modificaron `v259-review`, v258, main, la publicación oficial, cuentas, tablas, políticas ni funciones remotas.
- Copia ejecutable reutiliza recursos inmutados de `../v259-review/` y usa sus propios `index.html`, `config-v242.js`, `storage-v242.js`, `cloud-v242.js`, `access-settings-v259.js` y `operaciones-v242.js`.
- `HYS257_ENABLE_USER_MANAGEMENT=false` **solamente en el laboratorio**, para impedir cambios administrativos por la copia mientras se prueba el diseño.
- Base de la cola local propia: `hys-v259-audit-lab-queue::<usuario>::<módulo>`, diferente de Work; `localStorage`, `sessionStorage` e IndexedDB de los módulos usan `hys-v259-audit-lab::`. Evitar compartir pruebas con Work.

## 2. Alcance de inspección estática

- 26 archivos JavaScript de v259: sintaxis válida en los 26.
- 9 scripts JavaScript embebidos en `index.html`: sintaxis válida en los 9.
- 19 hojas CSS: estructuras de llaves balanceadas en las 19 (control estático, no sustituye renderizado).
- 45 referencias locales (scripts y estilos) comprobadas contra manifiesto y copia: ninguna ausente.
- 150 identificadores estáticos del HTML: sin duplicados.
- Dependencias: autenticación, control de roles, administración, APR, OTROS, riesgos, responsables, acciones, correcciones, auditoría, notificaciones, pendientes, fotos, PDF, guardado local, cola de sincronización y condiciones de conexión.
- 14/14 pruebas de reglas funcionales puras: fechas imposibles y bisiestas, compromisos, acciones verificadas, cierre con verificador independiente, evidencia y permisos, rechazo de datos de otro módulo.
- 14/14 pruebas del nuevo validador de facultades: rol, módulo vigente, permiso de lectura/escritura, delimitación de área, cambios y orden de revocaciones.
- Prueba de navegador, **sin autenticar ni modificar datos**: pantalla de login cargada con estilos completos; no se observaron errores visibles.

## 3. Problemas comprobados y correcciones en la copia aislada

### MEDIO — selector de rol con HTML incorrecto
El módulo `operaciones-v242.js` incluía `</option value="usuario">Usuario</option>`. Es un cierre inválido que puede producir opciones incorrectas según el parser. Sustituido por `</option><option value="usuario">Usuario</option>` en la copia.

### ALTO — controles de facultades basados en información incompleta
`access-settings-v259.js` mostraba como elegible un cambio de área sin comprobar `actor.modules`, y permitía una decisión positiva de capacidad de edición a partir de `puede_editar` aunque el módulo ya no estuviera autorizado o no tuviera `puede_ver`. En la copia, `canAssignArea` exige ámbito activo, áreas válidas y rol autorizado; `canGrantEdit` exige administrador general o administrador de área con módulo vigente y permisos de lectura y edición. Son protecciones de interfaz: la autorización definitiva permanece en Supabase.

### ALTO — fallos de adjuntos y fotografías
En la copia `index.html` ahora valida que datos de fotos para visor/PDF sean imágenes `data:image/...;base64` de formatos admitidos; evita que un dato histórico inesperado se convierta en un enlace de imagen no controlado. Acepta arreglos de adjuntos históricos incompletos sin dejar caer toda la tabla. Límite preventivo 20 MB por archivo, 60 MB por carga nueva y dimensiones máximas al procesar. Mejora errores de FileReader, Canvas y formularios. Requiere pruebas de fotografías reales y dispositivos.

### MEDIO — etiqueta de versión antigua en acceso
La pantalla de login aún mostraba `v242 · PDF revisado` dentro de la carpeta v259. Se eliminó únicamente en el laboratorio para no confundir a usuarios de prueba.

### CRÍTICO (prevención de conflictos) — aislamiento de datos de auditoría
Copiar el `cloud-v242.js` original sin adaptar su llamada `openNative('hys255-queue::...')` habría compartido la cola real de borradores de Work. Se creó una copia del módulo con cola independiente y se aislaron también prefijos de almacenamiento.

## 4. Hallazgos NO resueltos que bloquean aprobación operativa

### ALTO — modificaciones de accesos NO atómicas
`facultades-v242.js` utiliza un plan con varias llamadas consecutivas a `hys242_guardar_usuario` y `hys242_asignar_facultades`. Si una llamada se confirma y la siguiente falla, parte de la configuración queda aplicada. La interfaz informa el estado parcial y vuelve a consultar, pero **no hay transacción única para el conjunto completo**. Requiere un RPC atómico, compensación fiable o un flujo de confirmación explícito, con pruebas de fallos intermedios. No intentar resolverlo con un simple rollback en cliente.

### ALTO — modo offline incompleto
No existe registro de Service Worker ni manifiesto PWA en la app auditada. Depende de bibliotecas cargadas desde CDN y autenticación en línea. Guardado local no implica arranque completo sin Internet; tampoco garantiza resincronización remota. Pendiente ingeniería específica, validación de sesión, cola idempotente, conflictos y ensayos Android/iPhone.

### ALTO — pruebas funcionales con sesión real pendientes
No se probaron cambios reales de usuario ni delegaciones en Supabase. Faltan recorridos APR/OTROS por rol, guardado/reinicio, adjuntos, PDF multipágina/compartir/imprimir, recuperación de archivos, actualización de facultades, colisiones entre pestañas y regresión. La prueba de navegador solo verificó login sin credenciales.

### MEDIO — funcionalidades de Excel de laboratorio aún no integradas en v259 de Work
La carpeta `v259-review` no contiene el módulo `excel-control-lab.js`. La revisión de Excel realizada sobre v258 es independiente. No declarar que v259 incorpora automáticamente esa exportación.

## 5. Auditoría Supabase de SOLO LECTURA

Proyecto consultado: `ujfsugivgysyhboyirtz`, sin DDL, sin cambios de usuarios ni ejecución de RPC administrativas.

- Todas las tablas públicas enumeradas muestran RLS habilitado.
- Asesor de seguridad: 2 tablas de invitaciones (v241 y v242) con RLS y sin políticas. Generalmente significa acceso denegado desde Data API; confirmar si es intencional.
- Asesor de seguridad: `public.rls_auto_enable()` aparece como función `SECURITY DEFINER` ejecutable por `anon`; verificar y restringir `EXECUTE` si no se necesita. Es un **event trigger**, por lo que la advertencia no prueba por sí sola una ruta de explotación RPC.
- El asesor informa 42 advertencias de funciones `SECURITY DEFINER` accesibles a `authenticated`. No equivalen automáticamente a vulnerabilidades: se inspeccionaron definiciones de `hys242_contexto`, `hys242_guardar_usuario`, `hys242_asignar_facultades` y se observaron comprobaciones explícitas, pero falta auditoría exhaustiva de todas sus dependencias y del principio de mínimo privilegio.
- Edge Functions con `verify_jwt=false` incluyen `admin-users`, `admin-users-v241` y `admin-users-v242`. En `admin-users` y `admin-users-v242` se verificó validación manual del token mediante `auth.getUser(token)`; una bandera desactivada no implica necesariamente acceso anónimo.
- Asesores de rendimiento: 9 FKs sin índice, 8 avisos `auth_rls_initplan`, 2 `multiple_permissive_policies`, 14 índices no utilizados. Requieren perfil de consultas, análisis de políticas y decisiones supervisadas; no ejecutar cambios automáticos.
- Asesor de salud: sin observaciones.

Referencias de Supabase:
- Función de acceso anónimo: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- Funciones SECURITY DEFINER: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Tablas RLS sin políticas: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- FKs sin índices: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- Optimización RLS: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

## 6. Semáforo de salida

**No aprobar para producción todavía.** El código pasa sintaxis y pruebas de reglas aisladas, y la pantalla de acceso carga. No hay evidencia de prueba integrada con identidades reales ni de transacción atómica en la gestión de facultades. Las advertencias de seguridad deben clasificarse antes de desplegar.

## 7. Secuencia de pruebas recomendada

1. Tomar respaldo del desarrollo y confirmar que la rama Work sigue intacta.
2. Con cuentas de prueba: acceso por rol, APR/OTROS, formularios, cambios de módulo, cambio de permisos durante operación, paneles de administración.
3. Validar finalización de informe, guardado/reapertura, fotos, PDF, editar informes anteriores con permisos.
4. Probar fallo de red y cierre inesperado, conflictos entre pestañas y que el laboratorio no altera la cola de Work.
5. Probar transacción administrativa completa con un backend atómico en entorno aislado, incluyendo simulación de rechazo en segunda operación.
6. Confirmar datos de indicadores/Excel y luego planificar offline sin afectar producción.

**Ningún cambio remoto se efectuó.**
