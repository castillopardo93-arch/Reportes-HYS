# v273 — Correcciones de auditoría
Fecha: 2026-11-08
Rama: desarrollo/v273-correcciones-auditoria
Base: desarrollo/v272-auditoria-integral (copia aislada de 67 archivos)
Estado: desarrollo, pendiente de verificación funcional.

## Correcciones aplicadas
1. index.html: lista explícita de rutas QA ampliada a v272/v273; activación sigue condicionada a raw.githack.com y ?qa=1.
2. gestion-usuarios-v265.js: modo de laboratorio habilitado en v272/v273, sujeto a HYS265_LAB_MODE y existencia del simulador.
3. backend-simulador-v263.js: acepta ruta v273 en host de prueba con HYS263_SANDBOX y HYS266_PREVIEW_ONLY; nunca se habilita por defecto en producción.
4. verificacion-punto3-v266.js: acepta ruta v273 exclusivamente con bandera de QA.
5. index.html: encabezado actualizado a v273.
6. MANIFIESTO.json: estado no aprobado y pendientes documentados.

## Conservado deliberadamente
- Roles dinámicos no cargados en index.html.
- Roles fijos existentes y facultades.
- Guardado real de gestión de usuarios bloqueado hasta migración/autorización segura.
- Archivos heredados conservados, sin eliminar borradores ni respaldos.
- main, v271, v272, aplicación oficial y Supabase intactos.

## Pendiente (no afirmar resuelto)
- Pruebas reales de navegador, rotación móvil y accesibilidad.
- Flujos completos de PDF, fotos, formularios, hallazgos, seguimiento, notificaciones e historial.
- Confirmación de aislamiento de almacenamiento entre usuarios y tarjetas.
- Consolidación de flujos históricos duplicados tras comprobar que no hay dependencias.
- Revisión read-only de políticas RLS, RPC y permisos Supabase.
- Pruebas de regresión automatizadas y funcionales. 
- El modo offline/PWA permanece fuera de alcance por decisión del proyecto.

## Precaución
Las correcciones se verificaron mediante lectura de código fuente; no se ha ejecutado la app en un navegador ni pruebas E2E. No está aprobada para publicación.
