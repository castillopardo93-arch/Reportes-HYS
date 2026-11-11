# Reportes HYS v244 — Bloque E01–E05: interfaz de perfiles y áreas operativas

**Fecha:** 2026-11-05 | **Rama:** `desarrollo/v244`.

## Trabajo realizado antes de conectar servicios

| Punto | Estado en v244 |
|---|---|
| E01 | Contrato de identificación para personas con `userId` UUID, nombre, rol y ámbito estructurado. Usa roles predefinidos sin duplicar identidades. **Sin lectura del directorio real**. |
| E02 | Formulario de ficha de persona con cargo, teléfono, correo y preferencia de contacto; validación local y actualización **solo en memoria de la demo**. |
| E03 | Validadores de alcance por `organizationId`, `projectId`, `module` y `areaId`. Matriz de roles informativa. **Sin autorización efectiva ni RLS**. |
| E04 | Maqueta para listar, agregar, renombrar y activar/desactivar **áreas operativas** ficticias, diferenciadas de las áreas/tablas que controlan módulos y permisos. Los cambios **no alteran listas reales** y se pierden al recargar. |
| E05 | Sección preparada para historial central, con estado vacío explícito **sin eventos auditados**. Contrato de eventos, operaciones y permisos a conectar más adelante. |

## Prevención de conflictos de datos
- Una organización y sus proyectos deben tener identificadores UUID distintos. Incluso si dos proyectos utilizan una misma área nominal (p. ej. VA4), son ámbitos separados.
- Cada persona tiene una identidad durable, rol vigente y ámbitos autorizados. La interfaz no concede acceso en función de un nombre escrito o selección visual.
- Las áreas operativas se guardarán en entidad diferente de las áreas de permisos de módulo. La migración no debe renombrar la tabla de permisos existente ni mezclarla con sectores de obra.
- En la futura API, **todas** las operaciones deberán verificar organización, proyecto, área, módulo, actor y permiso efectivo del lado del servidor. No confiar en localStorage ni en los controles del navegador.
- Los datos de contacto reales y sus preferencias se tratarán como información personal de acceso restringido, no como campos públicos de la lista de usuarios.

## Límite deliberado de esta etapa
La pantalla se monta en Configuración, tanto APR como OTROS, deshabilitada en la copia de desarrollo sin backend. **Solo** `v244-review` proporciona datos ficticios y permite experimentar con fichas/áreas en memoria volátil. No usa clientes Supabase, no envía correos, no crea usuarios, no cambia permisos, no audita, no cierra hallazgos. **Ninguna función E se declara aprobada para producción.**

## Pendientes cuando se habilite el entorno de ensayo
- E01/E03: proveedores de lectura autorizada y consultas limitadas a roles/ámbitos, pruebas de revocación y privilegios.
- E02: cambios atómicos de ficha con políticas, registro de auditoría, control de consentimiento y acceso mínimo a datos personales.
- E04: CRUD lógico central de áreas operativas con transacciones, bloqueo de duplicados por proyecto y auditoría inalterable; eventual sincronización de desplegables autorizados.
- E05: lectura de eventos emitidos por servidor append-only, filtros por ámbito, pruebas contra manipulación e historiales de cambios.
- Compatibilidad de datos históricos, perfiles existentes y migración de respaldos sin módulo.

**Prohibido modificar o conectar** `main`, la aplicación oficial, `desarrollo/v243` o Supabase real sin autorización separada.
