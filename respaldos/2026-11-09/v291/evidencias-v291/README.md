# Reportes HYS — v291 | Seguridad de accesos y guardado protegido
Fecha: 2026-11-09. Rama: `desarrollo/v291-accesos-y-guardado-protegido`. Base exacta: `desarrollo/v290-riesgos-sin-codigos-visibles` (`e4fb4ef136bf4e11dd175e564996696098766c18`).

## Cambios aplicados exclusivamente en v291-review

1. **Áreas desactivadas:** la selección de facultades ya no considera válida un área marcada como inactiva. Se debe recargar la lista y seleccionar únicamente áreas vigentes.
2. **Cambio de rol:** requiere ficha real y válida del destinatario, identidad coincidente del Administrador General, y nunca acepta modificar su propio rol o la cuenta de otro Administrador General.
3. **Guardado local:** antes de permitir edición se verifica que la tarjeta pertenezca a los módulos de la sesión actual; si la identidad o el módulo cambian, se bloquea la edición.
4. **Cambios de estado de acceso:** tras la RPC se exige confirmar que la revisión del usuario aumentó y que el estado solicitado se observa en el directorio. Esto evita dar por confirmado un cambio ambiguo.

## Qué NO se activó ni modificó

- No se activó el guardado remoto. `HYS242_ENABLE_CENTRAL=false` y `HYS242_DEPLOYMENT_READY=false`.
- No se modificó `main`, las carpetas de v290, v289 o anteriores, la aplicación oficial, las tablas, usuarios, funciones RPC ni Auth de Supabase.
- No se habilitó alta/edición de cuentas del formulario unificado: su backend v279/v281/v282 continúa pendiente.
- No se prometen resultados E2E reales. Es obligatorio validar en navegador y con cuentas de prueba autorizadas antes de publicar.

## Pruebas

`evidencias-v291/test-seguridad-y-guardado-v291.cjs`: casos de áreas inactivas, cuentas sin identidad verificable, cambio de rol, selección de módulos, sesión desactualizada y confirmación de revisión del acceso.

CI: `.github/workflows/qa-v291-accesos-guardado.yml`. También ejecuta suites completas v290, v289 y v284.

## Siguiente fase requerida en Work (sin ejecutar hoy)

1. Validar estas reglas en navegación real y con perfiles autorizados.
2. Revisar individualmente los avisos de seguridad de Supabase (en especial funciones `SECURITY DEFINER`) sin revocaciones masivas.
3. Preparar y probar en entorno aislado el contrato transaccional para usuarios/facultades.
4. Preparar diseño de sincronización multiusuario, persistencia de PDF y fotografía y numeración global sin activar escrituras reales.
5. Pedir autorización explícita antes de tocar producción.
