# Reportes H y S
**Gestión de la Prevención de Riesgos, Higiene y Seguridad**

Aplicación independiente para obras de construcción, equipos de prevencionistas y supervisores con turnos rotativos de día y noche.

## Alcance de v1
- Registro de informes diarios y entregas de turno.
- Registro de acciones pendientes con responsable, plazo y estado.
- Evidencia fotográfica en registros.
- Historial y estadísticas básicas.
- Vista de impresión para guardar informes como PDF.
- Almacenamiento local y exportación/importación de respaldo JSON.
- Preparación de la arquitectura para futura integración autorizada con Google Drive.

## Estado
**v1 en desarrollo.** No considerar versión estable ni publicación oficial hasta completar pruebas funcionales, de privacidad, recuperación y dispositivos.

## Uso local
Abrir `index.html` en un navegador moderno. Para probar capacidades PWA/service worker, servir la carpeta mediante un servidor HTTP estático.

## Límites iniciales
La sincronización con Google Drive multiusuario, autenticación y resolución de conflictos requieren una implementación y pruebas adicionales. No se debe afirmar que están disponibles hasta que se implementen y validen.

## Independencia
Este repositorio no debe reutilizar ni modificar archivos, ramas, publicación o configuración de `mi-control-financiero`.
