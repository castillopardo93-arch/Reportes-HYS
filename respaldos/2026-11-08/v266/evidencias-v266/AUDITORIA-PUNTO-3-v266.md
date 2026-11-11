# Reportes HYS — v266 | Punto 3 de auditoría integral

**Fecha:** 2026-11-08  
**Rama exclusiva:** `desarrollo/v266-auditoria-punto-3`  
**Versión base:** v265 auditada, commit `d5a246dbdf199ce6bcbb00a2b7cf9245fc168196`  
**Estado:** DESARROLLO; no aprobado ni publicado.  
**Alcance interpretado:** "Punto 3. Problemas que todavía requieren autorización o pruebas", definido en el informe integral de la v265.  
**Regla:** la autorización para desarrollar v266 no habilita cambios a usuarios reales, Supabase, main o producción.

## Trabajo implementado

| Código | Pendiente del punto 3 | Trabajo ejecutado en v266 | Resultado |
|---|---|---|---|
| P3-01 | Seguridad Supabase (funciones privilegiadas) | Revisión SQL **solo lectura** y del asesor; documentación de funciones SECURITY DEFINER, privilegios y procedimientos de validación. | Evaluado; cambios de permisos pendientes de autorización. |
| P3-02 | Gestión real de cuentas e invitaciones | Se conservó el asistente de 5 pasos y la verificación de modelo/roles; sección técnica señala explícitamente que los guardados de Auth reales están desactivados. | Preparación y controles de desarrollo; creación real no implementada. |
| P3-03 | Notificaciones F02–F07 | Ensayo mediante `Hys251Notifications.tasks` con un hallazgo y responsable de laboratorio. No envía correos ni crea notificaciones de producción. | Comprobación local positiva; entrega real pendiente. |
| P3-04 | PDF, fotografías y cierre de informes | Se agregó comprobación autocontenida de jsPDF: firma %PDF y 2 páginas, y muestra PNG temporal. **No** se declara validado el PDF ni las fotos originales, ni finalización/cierre. | Ensayos de bibliotecas locales; flujos completos pendientes de navegador. |
| P3-05 | Recuperación de borradores anteriores | Exploración por identidad y tarjeta del almacenamiento anterior de v263/v265, filtro de claves de sesión y exportación JSON bajo confirmación explícita. No importa ni borra datos previos. | Respaldo conservador local; restauración a decisión posterior. |
| P3-06 | Integridad visual | Se reutilizó la aplicación completa de la v265 con las dos tarjetas, banda lateral de Administrador general, paneles existentes y configuraciones. La Verificación técnica está **dentro de Seguimiento**, no como nuevo botón de la cinta. | Integridad estructural comprobada; revisión visual en navegador pendiente. |

## Separación de datos y garantías

- `v266-review/storage-v242.js`: nuevo `hys-v266-laboratorio::` para formularios locales por usuario y tarjeta.
- Cola IndexedDB: `hys-v266-laboratorio-queue::` (no reemplaza v265).
- Datos simulados globales: `hys-v266-lab-shared::reportes-hys-v266-simulador-local-1`.
- Apariencia simulada: `hys-v266-lab-shared::reportes-hys-v266-apariencia-local`.
- No migración automática desde v265 a v266. Las copias antiguas permanecen intactas.
- La lectura heredada puede exportar únicamente borradores locales encontrados de v263/v265 que coincidan con el identificador del usuario y tarjeta seleccionados; **el respaldo JSON puede contener datos sensibles** y debe almacenarse de forma segura.
- La ruta `v266-review/index.html?qa=1` activa exclusivamente las herramientas de prueba; no autentica ni modifica usuarios reales.
- `HYS242_ENABLE_CENTRAL=false` y `HYS257_ENABLE_USER_MANAGEMENT=false` permanecen en configuración.

## Evaluación de seguridad Supabase (sin escrituras)

Consulta de asesor y función `pg_proc` realizada el 08-11-2026:

1. `public.rls_auto_enable()` figura como `SECURITY DEFINER` y `anon` dispone de EXECUTE. Revisar necesidad de exposición. **No está demostrada explotación** y no se revocó nada.
2. 42 avisos de funciones `SECURITY DEFINER` invocables por `authenticated`. No son 42 vulnerabilidades confirmadas; se requiere revisión por función de `auth.uid()`, pertenencia de módulo, controles de área, acceso a datos y pruebas negativas.
3. `invitaciones_v241` y `invitaciones_v242` tienen RLS habilitado sin políticas. Puede ser cierre por defecto; confirmar relación con Edge Function antes de crear políticas.
4. Verificar la autorización de `admin-users` y `admin-users-v242`, evitando asumir que `verify_jwt=false` implica necesariamente ausencia de autenticación: validar su comprobación explícita del token.
5. Toda corrección de permisos exige autorización separada, copia de respaldo, prueba negativa y despliegue controlado.

## Evidencias

- `v266-review/verificacion-punto3-v266.js` y `verificacion-punto3-v266.css`: controles y vista técnica no destructiva.
- `evidencias-v266/test-punto3-v266.cjs`: **10 casos de Node** reproducibles. El archivo se ha creado, pero **no se ha ejecutado con Node en este entorno**; no afirmar lo contrario.
- Se ejecutaron **14 comprobaciones de lógica directamente**: motor F02–F07, permisos ficticios, dos páginas PDF temporal, PNG, espacio v266, filtros de respaldo por usuario/tarjeta y rechazo cuando faltan bibliotecas o se habilitan indebidamente las banderas.
- Se ejecutaron **18 comprobaciones estáticas de integración**, verificando rutas de QA, namespaces de datos, ambas tarjetas y bloqueos de producción.
- Se validó sintaxis de 48 bloques inline de `index.html` y del código JS añadido.

**Límites:** no se validó con navegador real el flujo completo de PDF, fotografía, notificaciones, cierres y reportes de las dos tarjetas. Tampoco se probaron cambios efectivos sobre cuentas de Supabase. No declarar estos pendientes como finalizados.

## Procedimiento de prueba visual de v266

1. Abrir `v266-review/index.html?qa=1` en el origen de pruebas permitido.
2. Confirmar que aparecen las tarjetas **Prevencionistas** y **Supervisores/Capataces y otros**.
3. Abrir **Seguimiento de informes** desde la banda del Administrador general.
4. Presionar **Verificación técnica** y revisar cinco pruebas básicas (algunas pueden quedar pendientes si falta jsPDF).
5. Revisar Áreas y opciones, Gestión de usuarios y Apariencia, sin que aparezcan paneles duplicados.
6. Crear un informe ficticio en cada tarjeta y efectuar la inspección visual de PDF/fotografías/cierre; anotar incidencias.
7. Solo descargar borradores heredados de laboratorio bajo confirmación y custodia segura; no importarlos automáticamente.
8. Continuar la etapa F de la lista maestra cuando se autorice integración de backend y se compruebe entrega real.

## Versiones protegidas

- `main` y aplicación oficial: sin cambios.
- v264, v265 y anteriores: sin cambios por esta tarea.
- No se ejecutaron escrituras Supabase ni despliegues Edge.
- v266 usa una **nueva rama independiente** porque existía una rama experimental v266 anterior, descartada por el usuario. Esta rama se identifica expresamente como `desarrollo/v266-auditoria-punto-3` y no sobrescribe la experimental.

**Conclusión:** punto 3 preparado y verificado **parcialmente en desarrollo**, no cerrado operativamente. Los cambios reales de seguridad/Auth y el despliegue de notificaciones siguen pendientes de autorización y pruebas.
