# Reportes HYS — v266 · Punto 3 de la auditoría integral

**Base protegida:** v265, commit `d5a246dbdf199ce6bcbb00a2b7cf9245fc168196`.  
**Rama nueva autorizada:** `desarrollo/v266-auditoria-punto-3`.  
**Estado:** desarrollo, no aprobado. **No se cambió Supabase ni producción.**

## Objetivo solicitado
Abordar el bloque **«3. Problemas que todavía requieren autorización o pruebas»** de la auditoría de v265:
1. Seguridad de Supabase: funciones privilegiadas.
2. Cuentas reales: integración central.
3. Notificaciones F02–F07: envío, seguimiento y confirmación.
4. PDF, fotografías y cierre de informes.
5. Recuperación de borradores antiguos.
6. Offline: pospuesto por acuerdo.

## Aplicación de desarrollo
Se copió íntegramente `v265-review` a `v266-review` en una rama distinta. Se mantienen **las dos tarjetas originales**, su apariencia, formularios, panel de Gestión de usuarios, Áreas y opciones, Seguimiento y botón Apariencia inferior.

Para probar: abrir `v266-review/index.html?qa=1` desde raw.githack; iniciar en el selector de dos tarjetas como Administrador general ficticio; abrir **Seguimiento de informes → Verificación técnica**.

### Integración técnica incorporada
Archivo `verificacion-punto3-v266.js` (más CSS independiente):

- Diagnóstico seguro de cuenta: confirma validadores de trabajador/rol y que las banderas de escritura real permanecen apagadas.
- Caso de prueba F02–F07: genera una tarea ficticia con `Hys251Notifications.tasks`, verifica identificación del responsable, **sin enviar ningún mensaje**.
- PDF temporal: crea en memoria un documento de dos páginas mediante la biblioteca existente, verifica `%PDF-`, páginas y longitud, **sin guardar informes**.
- Verificación de imagen PNG de muestra en memoria (no implica que la cámara real funcione).
- Estado de aislamiento de v266.
- Respaldo **voluntario de solo lectura** de ciertas claves locales heredadas de versiones anteriores; filtra por usuario y tarjeta del contexto actual, excluye claves de autenticación, solicita confirmación y descarga JSON; **no restaura ni elimina** datos antiguos. Almacenes IndexedDB legados no se importan ni se borran.

### Seguridad e integridad
- Nueva clave de datos ficticios `reportes-hys-v266-simulador-local-1`.
- Apariencia ficticia `reportes-hys-v266-apariencia-local`.
- Espacio compartido para administración ficticia `hys-v266-lab-shared::`.
- Borradores e IndexedDB específicos de usuario/tarjeta `hys-v266-laboratorio::` / `hys-v266-laboratorio-queue::`.
- **No se migran automáticamente borradores ni usuarios ficticios de v265**.
- Se corrigió el prefijo de almacenamiento local de autenticación del duplicado v266 y una validación errónea de firma PDF.
- Todas las escrituras reales continúan desactivadas por las banderas de `config-v242.js`.

## Pruebas realizadas en esta revisión

- **18/18** verificaciones de integración del código: dos tarjetas, rutas de QA exclusivas de v266, almacenamiento segregado, cinco dependencias de v265 adaptadas, cero escrituras centrales habilitadas, scripts válidos.
- **12/12** comprobaciones del módulo técnico: tareas ficticias, bloqueo de cuentas reales, PDF de prueba, imagen, ámbito local, respaldo filtrado por usuario/tarjeta, exclusión de claves de autenticación y detección de un flag central activado.
- **48 scripts embebidos** de `index.html` verificados por sintaxis.

Estos controles usan simulaciones de JavaScript; no sustituyen prueba visual de navegador, SMTP, Supabase Auth, instalación de Edge Functions, RLS bajo varios usuarios ni generación de PDF real con fotografías.

## Evaluación de seguridad en solo lectura

Se consultaron los asesores y permisos actuales de Supabase. Al 8 de noviembre de 2026:
- La función `public.rls_auto_enable()` de tipo `SECURITY DEFINER` tiene permiso `EXECUTE` para `anon` y `authenticated`, según catalogación de PostgreSQL. Se recomienda evaluar la revocación de `EXECUTE` si no necesita acceso mediante la API, pero **no se ejecutó REVOKE**.
- El asesor marca **42 funciones SECURITY DEFINER ejecutables por authenticated**. Muchas son RPC funcionales y requieren pruebas de autorización individual; **no deben revocarse indiscriminadamente**.
- `invitaciones_v241` y `invitaciones_v242` tienen RLS y ausencia de políticas públicas; verificar servicio de gestión, sin abrirlas automáticamente.
- Las Edge Functions de administración históricas usan `verify_jwt=false`, pero su código sí realiza autenticación mediante `auth.getUser`; requiere pruebas negativas antes de cambiar configuración.
- **No se han implementado cuentas reales, envío de correo ni cambios de esquema**.

Fuentes de control Supabase:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Pendientes para cierre del punto 3

| ID | Trabajo | Estado |
|---|---|---|
| P3-01 | Inventario de seguridad Supabase | Verificado solo lectura; decisión y pruebas de seguridad pendientes |
| P3-02 | Crear cuentas reales con ficha, autorización y auditoría | Contrato y validadores conservados; backend seguro no implementado |
| P3-03 | Notificaciones por correo/in-app reales | Prueba local F02–F07 disponible; servicio y confirmación pendientes |
| P3-04 | PDF de muestra, fotos, imprimir, finalizar, recuperar | Smoke test PDF de 2 páginas; pruebas reales de flujo, fotos y cierre pendientes |
| P3-05 | Borradores antiguos | Respaldo local selectivo y voluntario; restauración/migración segura pendientes |
| P3-06 | Offline | Pospuesto según instrucción anterior |

**No considerar estas funciones completas hasta aprobar pruebas reales y autorizar cambios de backend.** Los puntos pendientes se conservarán en la Lista Maestra por letras, sin fingir aprobaciones.
