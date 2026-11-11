# Reportes HYS — v282 · Recuperación de Áreas y opciones

Fecha: 2026-11-08  
Rama: `desarrollo/v282-areas-opciones-unificadas`  
Base: `desarrollo/v281-regimen-laboral` (copia independiente).  
Estado: desarrollo de prepublicación, sin simuladores; pendiente backend auditado y prueba real de usuario.

## Requerimiento visual

El usuario mostró la interfaz histórica de v266 y pidió exactamente su estructura de trabajo: **Áreas de trabajo**, **Opciones de formularios** y **Historial** dentro del mismo recuadro; **Módulo / Selector / Nombre / Crear**, más **Editar nombre**, **Desactivar/Reactivar** para cada registro. Todo lo administrable por **Administrador general**, con conservación de áreas y el régimen de turno habitual del trabajador (5x2, 4x3, 10x5, 7x7).

## Implementación realizada en frontend

- Nuevo `catalogo-unificado-v282.js`, que reemplaza el panel técnico «Administración central · v242» del `cloud-v242.js`.
- El panel se titula **Áreas y opciones** y usa los estilos clásicos de `v242.css` con ajustes de legibilidad y móviles.
- **Pestaña Áreas de trabajo:** lee `areas_trabajo_v242` por módulo, incluye cuentas autorizadas por la política de área (Administrador general y delegados facultados).
- **Pestaña Opciones de formularios**, 9 selectores:
  1. Turno del informe diario (`listas_v242.shift`).
  2. Proyecto (`listas_v242.project`).
  3. Resultado.
  4. Prioridad.
  5. Estado.
  6. Responsables del informe.
  7. Tipo de actividad.
  8. Estado alternativo.
  9. **Turno habitual / régimen laboral** (catálogo autónomo `regimenes_laborales_v281`).
- El selector de **Turno habitual** no utiliza ni cambia los datos de Día/Propio o Noche/Propio. Es global a los trabajadores y no requiere elegir APR/OTROS.
- **Pestaña Historial:** consulta `auditoria_areas_v242` y `eventos_v242` de acuerdo a RLS.
- `Proyecto` ya no se sobrescribe con un valor estático después de recibir `setCatalog`: se dibujan las opciones reales del módulo; valores de informes antiguos se preservan como histórico si ya no existen en la lista activa.
- El Administrador general puede ver y, una vez integrado el servidor, modificar todas las listas operativas anteriores. La administración delegada de áreas se conserva. Roles de seguridad, estados técnicos internos, preferencias semánticas, supervisores registrados y columnas numéricas de fotos no se tratan como catálogos arbitrarios porque modificar sus códigos rompería reglas de seguridad, identidad, notificaciones o renderizado.
- **No se activa el guardado central de informes** por el simple hecho de administrar catálogos. Ambas funciones permanecen independientes.
- No hay inicio de sesión ficticio ni datos de laboratorio en el cargador real.

## Guardado y auditoría real

El código no ejecuta cambios hasta que el usuario elige una opción, entrega motivo, acepta el cuadro de confirmación y Supabase autoriza el procedimiento. Antes de habilitar esos botones exige la RPC `hys282_catalogo_capacidades` y utiliza exclusivamente la RPC `hys282_catalogo_mutar`, que está incluida en el script independiente propuesto.

Script preparado (no ejecutado): `propuestas-backend-v282/GESTION-UNIFICADA-AREAS-Y-LISTAS-v282.sql`.

- Contiene un catálogo de regímenes laborales independiente, con 5X2, 4X3, 10X5 y 7X7 como valores iniciales.
- Operaciones atómicas de alta, edición, desactivación/reactivación con autor, motivo y antes/después.
- Protecciones: `auth.uid()`, rol activo, administrador general y permisos delegados de áreas, listas permitidas por nombre, comprobación de revisión, duplicados y al menos una opción activa por categoría.
- Auditoría de áreas ya existente en la tabla `auditoria_areas_v242`; todas las acciones también se registran en `eventos_v242`.
- No almacena documentos, contraseñas, token ni números de identificación en el historial.

**Estado actual:** la estructura y lectura de los catálogos v242 son reales, pero los botones de modificación permanecen deshabilitados hasta instalar el nuevo backend. Activar una conexión de Internet o autenticarse NO instala esas funciones automáticamente.

## Verificaciones realizadas

- Verificación estática de que las 8 listas originales coinciden exactamente con la lista blanca del procedimiento SQL y el noveno selector usa la tabla independiente.
- 14/14 pruebas del servicio con cliente de Supabase emulado (solo pruebas de código, ningún dato ficticio visible en la app).
- 10/10 pruebas de estructura y apertura del panel sobre DOM controlado: botón en menú original, panel, módulos, pestaña, selector 9 opciones, consultas reales simuladas, bloqueo seguro de escrituras sin RPC.
- 4/4 pruebas de conexión del formulario de turno laboral al catálogo v282.
- `index.html` y sus scripts embebidos: validación de sintaxis; `cloud-v242.js`, `catalogo-unificado-v282.js` y `ficha-backend-v279.js`: validación de sintaxis.
- No se ejecutaron pruebas reales con contraseña administrativa en un navegador ni mutaciones reales de Supabase.

## No se ha modificado

- Supabase de producción, Auth, tablas o funciones vigentes.
- Rama `main`, aplicación oficial, versiones anteriores o respaldos.
- Trabajadores, permisos, informes, áreas, listas y regímenes existentes.

## Verificación posterior a la instalación (sujeta a autorización)

Se deben probar con una cuenta administradora real, y con un usuario de área delegado: consulta de ambas tarjetas, crear/editar/desactivar/reactivar áreas y cada lista, actualización en formularios de Proyecto/Turno/Resultado/Estado, régimen habitual 5x2/etc., auditoría, permisos denegados, edición concurrente y preservación de información histórica. No aprobar publicación sin esas pruebas.
