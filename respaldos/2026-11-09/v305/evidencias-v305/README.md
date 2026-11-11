# Reportes HYS v305 — Investigación de accidentes en Administrador General

Base: v304, commit `78904d3f0fa5adc015370db43fd9f51f0d5f6878`. Rama aislada: `desarrollo/v305-investigacion-accidentes-admin`.

## Implementado en la interfaz
Se incorpora la nueva opción **Investigación de accidentes** en el menú lateral del Administrador General, colocada después de Pilares e Indicadores y antes de Apariencia, manteniendo el formato expandible y el diseño de la aplicación.

Al pulsar la opción, abre una nueva pantalla inicial integrada con estado de módulo en preparación, cuatro indicadores sin datos consolidados y seis etapas propuestas: antecedentes, personas involucradas, descripción y evidencia, análisis de causas, medidas preventivas y verificación/cierre.

El módulo **todavía no permite crear ni consultar investigaciones** porque falta revisar el formulario oficial del usuario. El botón de creación figura desactivado. No se introdujeron datos ficticios, RPC, SQL, registros ni almacenamiento nuevo.

## Seguridad y navegación
- Visible solo para Administrador General con perfil activo, mientras se encuentra en el selector principal.
- Se cierra al cambiar de usuario, salir de la pantalla principal, navegar a otro botón o pulsar Cerrar/Escape.
- Respeta la confirmación de cambios sin guardar en Gestión de usuarios y Apariencia.
- Modo de revisión sin credenciales mediante `v305-review/index.html?revision=accidentes`, con el mismo componente visual y sin permisos reales ni acceso a datos.
- Banderas de escritura central apagadas; se mantienen intactas `main`, Supabase y las versiones previas.
- Versión de desarrollo solo en pantalla de elección de tarjetas.

## Validaciones
`evidencias-v305/test-investigacion-admin-v305.cjs` y `.github/workflows/qa-v305-investigacion-admin.yml` con regresiones de v304 a v284.

## Pendiente
Formularios reales, estructura de base de datos, controles de datos personales, permisos delegados, auditoría y pruebas manuales de la interfaz. No existe publicación oficial de v305.
