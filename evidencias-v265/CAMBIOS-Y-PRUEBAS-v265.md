# Reportes HYS — v265 · Gestión de usuarios y Creación de cuenta

**Base:** v264 protegida (commit `bd959da840f057ce3a1d0c9fcbaa282b2cc83dc2`).
**Rama:** `desarrollo/v265-gestion-usuarios-trabajadores`.
**Estado:** copia independiente de desarrollo. No aprobada, no publicada. Sin modificación de Supabase de producción.

## Cambios solicitados

La banda lateral del Administrador general se reorganiza de forma coherente:
1. **Gestión de usuarios**, opción única para fichas, creación y edición de trabajadores, roles, tarjetas, áreas permitidas y facultades.
2. **Áreas y opciones**, entrada independiente. En el laboratorio ofrece altas, cambios y activación/desactivación de áreas ficticias. En la app conectada sigue pendiente la consolidación funcional de catálogos, sin escribir en producción.
3. **Seguimiento**, se conserva el flujo existente de la aplicación conectada.
4. **Apariencia**, botón único al pie de la banda lateral.

Se evita la duplicidad visible de los accesos previos a Usuarios y Facultades. Se retira el montaje de la maqueta de fichas y ámbitos en la Configuración de las tarjetas. No se altera la configuración específica de fotos, informes o PDF.

## Secuencia definitiva de cinco etapas

1. **Ficha del trabajador**: nombre completo, RUT validado con dígito verificador, cargo, gerencia, empresa, proyecto y supervisor responsable de un directorio de usuarios activos. Otros datos: celular, correo personal, corporativo, fecha de ingreso, estado laboral, código interno, unidad organizacional, turno y preferencia de contacto.
2. **Creación de cuenta**: elegir correo de ingreso (corporativo o personal, al menos uno válido) y un método de invitación. No se generan ni solicitan contraseñas y no se envía correo real en el laboratorio. La cuenta ficticia queda con `pendiente_invitacion`. El correo cambiado durante edición requiere revalidación futura.
3. **Rol y tarjetas**: Usuario, Supervisor o Administrador; Prevencionistas y Supervisores/Capataces u otros; editar informes propios según permiso.
4. **Áreas y facultades**: todas las áreas activas o selección por tarjeta, diez facultades administrativas por tarjeta cuando el rol es Administrador. Permisos de revisar/aprobar/cerrar/editar otros requieren Consultar informes. Cambio de rol al dejar o recuperar Administrador limpia todas las facultades anteriores.
5. **Revisión y guardar**: resumen, motivo obligatorio y guardado simulado de todos los datos en una sola operación local ficticia; en la app real la operación permanece bloqueada hasta disponer de transacción segura de servidor.

Dentro de Gestión de usuarios figuran tres vistas: **Crear usuario**, **Usuarios registrados** y **Historial**. Las nuevas cuentas y sus modificaciones quedan auditadas con fecha, actor, motivo, valores anteriores y nuevos. RUT, celulares, emails y secretos se excluyen de los valores mostrados en auditoría, incluso cuando se consultan eventos anteriores.

## Laboratorio autónomo

Archivo `v265-review/laboratorio-integral-v265.html`. HTML, CSS y código JavaScript integrados para evitar caché de versiones antiguas; datos guardados únicamente en `localStorage`, clave `reportes-hys-v265-simulador-local-1`. Acceso ficticio de Administrador general. **Usar solo datos inventados.** No modifica usuarios, auth, registros o correos reales.

## Código principal

- `worker-model-v265.js` — normalización, validación de RUT, correos, supervisor, accesos, facultades y redacción de auditoría.
- `gestion-usuarios-v265.js` y `gestion-usuarios-v265.css` — banda y flujo de cinco pasos, directorio e historial.
- `backend-simulador-v263.js` — ampliado para alta y edición conjunta ficticias, auditoría y estado de cuenta.
- `index.html` — monta el centro unificado y retira la maqueta duplicada en Configuración.
- `evidencias-v265/test-gestion-usuarios-v265.cjs` — 12 casos Node reproducibles.

## Comprobaciones realizadas

Se ejecutaron **28 comprobaciones** de lógica de modelo y backend simulado en el entorno de revisión, todas aprobadas:
- RUT y dígito verificador, campos obligatorios, supervisor registrado y correos.
- Elección de correo de acceso, invitación pendiente y cambio de correo pendiente de verificación.
- Creación ficticia de trabajador/cuenta con accesos y auditoría, RUT y correos fuera de la auditoría.
- Prohibición de duplicados; facultades dependientes y bloqueos de tarjetas deshabilitadas.
- Revocación de facultades y posterior re-designación de Administrador sin privilegios heredados.
- Aislamiento de almacenamiento de v265 y bloqueos de escritura reales.
- Presencia de cinco pasos y scripts en la app, retirada del montaje anterior y compilación JS.

**Límites:** las 12 pruebas Node están incorporadas, pero no se ejecutaron con Node en este entorno GitHub conectado. La navegación integral en navegador y el envío real de invitaciones no se validaron. Requieren siguiente revisión y backend de pruebas, sin habilitar producción. Las cuentas de producción y Supabase siguen sin cambios.

## Integración futura pendiente

Para habilitar el registro real deben diseñarse y aprobarse tablas seguras de ficha laboral y cuenta vinculada a Supabase Auth, reglas RLS y privacidad para RUT/contactos, alta/invitación idempotente, creación transaccional de ámbito, facultades y auditoría, y pruebas de rechazo y concurrencia. No habilitar flags de gestión real sin esa verificación.

## Versiones protegidas

Ninguna escritura en `main`, v264, v263 u otras versiones protegidas. No se toca modo sin conexión.
