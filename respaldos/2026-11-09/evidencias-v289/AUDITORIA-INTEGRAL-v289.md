# Reportes HYS — Auditoría integral y consolidación v289

**Fecha:** 9 de noviembre de 2026. **Estado:** desarrollo aislado, no publicado. **Base:** v288.
**Rama:** `desarrollo/v289-auditoria-integral-consolidacion`
**Código:** `v289-review/`
**CI:** https://github.com/castillopardo93-arch/Reportes-HYS/actions/runs/42601129117

## Resumen

Se consolidó la aplicación de Prevencionistas y Supervisores/Capataces, gestión de usuarios, facultades, catálogos, formularios, archivos PDF locales, seguimiento y el panel estratégico Pilares e Indicadores. Se aplicaron correcciones funcionales de bajo riesgo en copia nueva. Se inspeccionó Supabase mediante lectura y sus asesores de seguridad/rendimiento; no se modificaron tablas, usuarios, políticas ni archivos de producción.

**Pruebas automatizadas:** 43 de consolidación/DOM/roles/rutas/sintaxis + 16 regresiones de v284 = **59 aprobadas**.
Estas pruebas no constituyen una validación de navegador autenticado ni de escrituras centrales.

## Correcciones verificables v289

| ID | Cambio | Archivo |
|---|---|---|
| C01 | Exigir ambas banderas (ENABLE_CENTRAL y DEPLOYMENT_READY) para intentar sincronización central | cloud-v242.js |
| C02 | No colocar operaciones remotas en cola al restaurar un borrador legado en modo local | cloud-v242.js |
| C03 | Mensajes de guardado/errores consistentes con modo local | cloud-v242.js |
| C04 | Historia remota con respuesta nula se transforma en lista vacía antes de paginar | cloud-v242.js |
| C05 | Fallo de caché local del catálogo no impide aplicar los valores obtenidos | cloud-v242.js |
| C06 | Falta de sessionStorage no bloquea apertura de un borrador válido | cloud-v242.js |
| C07 | PDF del historial local disponible aunque DEPLOYMENT_READY esté activo y ENABLE_CENTRAL inactivo | index.html |
| C08 | Fecha local actualizada al abrir informe nuevo, incluso después del cambio de día sin recargar | index.html |
| C09 | Administrador General con permisos de módulos explícitos ve solo tarjetas autorizadas; sin permisos explícitos conserva ambas como compatibilidad histórica | index.html |
| C10 | Estado y etiquetas de la interfaz corresponden a v289 | index.html, cloud-v242.js |

## Auditoría de infraestructura (solo lectura)

Observaciones a 09-11-2026:
- Migraciones instaladas hasta **hys_v242_correcciones_aisladas**.
- Tablas de informe, áreas, listas, facultades y auditoría v242 existen; no están desplegados los contratos recientes v279/v281/v282.
- Las funciones RPC presentes incluyen `hys242_contexto`, `hys242_consultar_informes`, `hys242_guardar_con_motivo`, `hys242_revisar`. **No existen** `hys279_capacidades`, `hys282_catalogo_capacidades` o `hys282_catalogo_mutar`.
- `listas_v242` conserva opciones de proyecto antiguas PHAM 1 y PHAM 2; la interfaz v289 ya protege la denominación vigente, pero la migración de catálogo central **no se realizó**.
- Asesores Supabase: **46 avisos de seguridad**, desglosados en **44 WARN y 2 INFO**. Los avisos son señales para revisar; no equivalen automáticamente a 46 brechas confirmadas.
- Desglose seguridad: RLS sin política (2 INFO); función SECURITY DEFINER ejecutable por anon (1 WARN); SECURITY DEFINER ejecutable por authenticated (42 WARN); protección de contraseñas filtradas (1 WARN).
- **33 avisos de rendimiento:** 9 claves foráneas sin índice, 8 planes de auth/RLS, 14 índices sin uso aparente y 2 políticas permisivas superpuestas. Revisar sin borrar índices automáticamente.
- Edge Functions `admin-users` y variantes existen; que `verify_jwt=false` figure en algunas versiones requiere revisar autenticación efectiva del código y no demuestra por sí solo un acceso indebido.

Referencias oficiales:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Funciones pendientes por habilitación real

1. **P0**: contrato de almacenamiento central, validación de permisos por servidor, historial sincronizado de informes y fotografías.
2. **P0**: seguridad backend: revisar asesores de seguridad y funciones expuestas individualmente; no aplicar revocaciones masivas sin evaluar dependencias.
3. **P1**: catálogo central vigente, migración sin perder históricos, fichas laborales/regímenes y RPC v279-v282.
4. **P1**: cierres de hallazgos, notificaciones con confirmación, evidencia y verificación; métricas reales.
5. **P1**: numeración global única de informes.
6. **P2**: informes ejecutivos, Excel CONTROL INTEGRAL HYS, panel de indicadores con desglose y exportaciones.
7. **Fuera de esta auditoría:** modo offline/PWA pendiente de fase posterior.

## Pruebas manuales aún no efectuadas

- Acceso real del administrador con dos tarjetas y con solo una tarjeta.
- Alta/cambio de usuario con facultades especiales (backend posterior aún no instalado).
- Guardado y recuperación entre dos dispositivos/cuentas.
- Generación, apertura, impresión y archivo del PDF APR y OTROS en navegadores reales.
- Cierres verificables, notificaciones y métricas consolidadas con registros de origen.
- Navegación y disposición responsive sobre hardware móvil físico.

## Protección y entrega

No se modificaron ramas anteriores, main, versión publicada ni Supabase de producción. Las nuevas correcciones están exclusivamente en `v289-review/`. Los reportes estratégicos presentan datos pendientes, no cifras simuladas. Sin aprobación específica de publicación no se recomienda activar banderas, aplicar migraciones ni publicar esta versión.
