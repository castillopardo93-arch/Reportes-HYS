# Reportes HYS — v309 · Integración de investigación en interfaz avanzada

**Estado:** Desarrollo aislado, NO publicado. Basada en `desarrollo/v308-flujo-investigacion` commit `1b6ce4f5d4ebcef5f47cac89b7f7966462f22a9c`.

## Entradas de revisión

- **Aplicación avanzada completa:** `v309-review/index.html` — conserva login, tarjetas de acceso según permisos, panel Administrador General, formularios APR/OTROS y demás funciones preexistentes.
- **Prueba de formularios:** `v309-review/demo-v308.html` — usuarios ficticios y flujo de revisión en memoria, sin escrituras.
- **Revisión directa de Final Report:** `v309-review/demo-final-causas-v308.html` — solamente puntos 9 y 10, sin completar Flash Report.

## Cambios incorporados en la app avanzada

1. Administración General → Investigación de accidente → Flash Report, Final Report y Seguimiento Flash.
2. Flash Report: guardar borrador incompleto; antes de enviar a revisión se exigen antecedentes mínimos, con campos rojos y aviso de faltantes que se actualiza al corregir.
3. Final Report: puede comenzarse cuando Flash completo ha sido enviado a revisión; su aprobación definitiva requiere Flash aprobado. En la vista de prueba del punto 9 se puede ingresar directamente sin Flash.
4. Análisis de causas, **punto 9**: cinco grupos con 153 opciones, cada una identificada por **código y nombre literal**, extraído de la hoja Tabla del HSS-RGT-007 Rev. 08. Los cinco grupos tienen tamaños 37, 36, 25, 24 y 31. No se carga Excel desde el formulario.
5. Planes de acción, **punto 10**: columna **CÓDIGOS** es texto libre, NO lista desplegable, respetando la plantilla; plan recomendado conserva campo descriptivo y permite agregar filas.
6. Búsqueda de revisores por nombre/apellido; en modo real, el listado existente de usuarios activos solo puede consultarlo Administración General. Para usuarios básicos falta un servicio seguro de directorio, y el envío real permanece deshabilitado.
7. Gestión de usuarios → Permisos y facultades → Investigación de accidente: múltiples autorizados independientes para cerrar Flash y Final, con responsable sugerido por tipo. Propuestas no persistentes en esta etapa.
8. Cierre definitivo separado de revisar: no autoaprobación del elaborador; cierres por facultades explícitas; expediente, cambios y seguimiento trazables en **simulación**, todavía no en backend.

## Seguridad y límites

- `main`, app oficial y versiones `v308` y anteriores intactas.
- No hay cambios de RLS, Edge Functions, roles, tablas, usuarios ni datos de producción en Supabase.
- Las autorizaciones nuevas, envío, historial y casos de investigación aún son **interfaz/prototipo**, no servicio operativo. Los borradores de investigación del laboratorio no son persistentes.
- **No ingresar datos de accidentes reales en los laboratorios ni declarar habilitada la operación productiva.**
- La nueva v309 está preparada para la revisión visual y auditoría de la aplicación avanzada antes de autorizar una futura integración de backend.

## Validaciones

GitHub Actions `.github/workflows/qa-v309-investigacion.yml`: flujo Flash/Final, permisos/cierre simulado, búsqueda de revisores, ubicación de 153 códigos en cinco categorías, punto 10 sin desplegable, regresión v306 y verificación estática de la app avanzada v309.
