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


## Correcciones posteriores sobre la MISMA v265 — banda lateral, áreas y apariencia

Se corrigió el acceso de desarrollo para que el laboratorio inicial redirija a la **aplicación completa** `index.html?qa=1`, con **ambas tarjetas** y formularios intactos. La vista QA se activa exclusivamente desde la ruta `v265-review/index.html` en `raw.githack.com` con `qa=1` y usa un usuario administrador ficticio, sin consultar ni escribir cuentas o informes en Supabase.

- **Gestión de usuarios**: única sección para altas, roles, tarjetas, áreas autorizadas, facultades e historial. El botón Continuar muestra validaciones junto al pie y permite autocompletar datos ficticios para probar los cinco pasos.
- **Áreas y opciones**: se recuperó el botón original `manageOpen242` y su ventana `management242`, conservando las pestañas **Áreas de trabajo**, **Opciones de formularios** e **Historial de áreas**. En QA se reemplaza solo la fuente de datos y los guardados por un catálogo ficticio local (áreas y listas); la interfaz original se mantiene. Se eliminó la ruta errónea que abría Gestión de usuarios desde Áreas.
- **Seguimiento**: las funciones de informes siguen separadas; cualquier antigua entrada al módulo de usuarios se redirige al único centro de Gestión de usuarios. Los botones duplicados de Usuarios y Facultades se ocultan en la banda.
- **Apariencia**: se mantiene **exactamente el panel original** `appearancePanel242` con paletas, 13 controles de color, 10 selectores de iconos, 6 valores de identidad/textos, logotipo, tipografía, espaciado, bordes, previsualización, restauración y guardado. Se corrigió la lectura de QA que intentaba consultar tablas no disponibles y se agregó almacenamiento independiente `reportes-hys-v265-apariencia-local`, con control de revisión y hasta 25 estados históricos. En QA el botón dice «Guardar apariencia de prueba»; no escribe en tablas de Supabase ni modifica apariencia compartida. El botón Apariencia se conserva al pie de la cinta.
- La cinta lateral del administrador general se limita a la **pantalla principal de tarjetas**, no a los módulos internos. El código inicializa Apariencia tanto al seleccionar como al abandonar una tarjeta.

### Verificaciones complementarias

- **26/26 pruebas de integridad estática**: sintaxis de scripts, presencia del panel original, aislamiento QA, formularios originales, ruta Áreas correcta, un solo punto de Gestión de usuarios, ajustes disponibles en Apariencia y botón al pie.
- **12/12 comprobaciones funcionales de la persistencia local de Apariencia**: cargar ajustes predeterminados, guardar colores y textos, recuperar tras nueva lectura, controlar revisiones, conservar historial, restaurar versión anterior y evitar almacenamiento fuera de la clave local.
- **Revisión visual previa de la aplicación completa**: ambas tarjetas visibles; apertura de Prevencionistas y regreso a las tarjetas; Gestor de usuarios y sus validaciones visibles. En esa revisión se detectó la ausencia de Apariencia. La **segunda revisión visual** de las correcciones de Áreas y Apariencia **no pudo ejecutarse** por bloqueo del servicio externo de navegación, por lo que queda **pendiente validar con el usuario en navegador real**. No se debe declarar aprobación visual ni una auditoría end-to-end inexistente.

**Restricciones:** se modificaron únicamente archivos en la rama existente `desarrollo/v265-gestion-usuarios-trabajadores`. No se creó otra versión para estos arreglos. `main`, v264 y las demás versiones protegidas no se modificaron. Las configuraciones históricas de Apariencia que existieran en Supabase no se borraron; el laboratorio QA no las importa por seguridad, por lo que presenta el valor por defecto o lo que se haya guardado localmente en v265.


### Corrección puntual de navegación tras capturas del usuario (misma v265)

Las capturas mostraron la banda lateral sin Apariencia y la pantalla de Áreas mostrando el formulario de usuarios por superposición. Cambios aplicados exclusivamente en v265:

- `gestion-usuarios-v265.js`: asegurar el montaje del **botón Apariencia original** en la banda del Administrador general; mostrarlo al escoger entre las dos tarjetas y ocultarlo fuera de esa pantalla. Se reutiliza el botón nativo de Áreas. Un controlador en fase de captura cierra el panel anterior al cambiar entre Gestión de usuarios, Áreas, Seguimiento o Apariencia, respetando la confirmación al descartar cambios sin guardar.
- `areas-opciones-qa-v265.js`: antes de abrir el panel original de Áreas, cerrar el formulario de usuarios o Apariencia que hubiera quedado abierto; después mostrar exclusivamente **Áreas de trabajo, Opciones de formularios e Historial de áreas**.
- `gestion-usuarios-v265.css`: asegurar visibilidad y anclaje inferior de Apariencia al expandir la banda. No modifica la apariencia de los informes ni las dos tarjetas.
- `index.html`: actualizar únicamente las referencias de los 7 recursos JavaScript/CSS afectados con parámetro de caché, manteniendo la misma rama y versión v265. Esto evita scripts anteriores en las vistas de ensayo.

**Pruebas ejecutadas en el código de esta corrección:** 7/7 escenarios de navegación de paneles (alternar Áreas, Usuarios, Seguimiento y Apariencia, y cancelación por datos pendientes), y 2/2 verificaciones de visualización lógica de botones (Apariencia original montada y visible en selector del administrador; botones de más ocultos fuera de selector). Estas pruebas de lógica no sustituyen una verificación visual manual del navegador. `main` y `v264` no sufrieron cambios. No se activaron escrituras en Supabase.
