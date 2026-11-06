# Reportes HYS — Auditoría profunda de código e integración
Fecha de revisión: 6 de noviembre de 2026
Base conservada: `desarrollo/v258`, carpeta `v258-review`.
Copia revisada: `desarrollo/excel-v258-auditoria-offline`, carpeta `v258-excel-lab`.

## Alcance examinado
Se verificó la estructura y sintaxis de los 25 módulos JavaScript de v258, 9 scripts embebidos en el HTML, 18 hojas CSS de v258, estilos del laboratorio, referencias a 45 recursos, 150 IDs de HTML (sin duplicaciones estáticas) y dependencias principales entre autenticación, Work, guardado, informes, PDF, fotos, pendientes, riesgos, responsables, correcciones, acciones, auditoría, notificaciones, Excel y administración. La ausencia de errores de sintaxis no prueba ausencia de errores funcionales.

## Problemas prioritarios corregidos (solamente copia aislada)

### CRÍTICO — base de datos de borradores compartida
**Archivo:** `v258-excel-lab/cloud-v242.js`.
**Hallazgo:** `cloud-v242.js` de Work usa `HysStorage242.openNative('hys255-queue::'+uid+'::'+module)` y esta llamada omite deliberadamente el prefijo genérico. Reutilizarla sin modificación desde un laboratorio compartía físicamente la misma cola de borradores.
**Corrección:** se copió el módulo a la carpeta del laboratorio y se sustituyó exclusivamente su ruta de cola por `hys-excel-v258-lab-queue::<uid>::<module>`. `index.html` carga esa copia. Ningún archivo de Work se modificó.
**Prueba pendiente:** comprobación física en dos pestañas y perfiles reales.

### ALTO — exportación podía omitir el borrador verdadero de Work
**Archivos:** `excel-control-lab.js`, `storage-v242.js`.
**Hallazgo:** la lectura de v258 atendía al `localStorage` secundario y archivo de PDFs, no al registro canónico `draft/current` del IndexedDB `hys255-queue::<uid>::<module>`.
**Corrección:** lectura opcional de la cola principal, existencia del DB comprobada antes de abrir, transacción `readonly`, verificación de usuario/módulo y cierre de base; luego lectura secundaria sin duplicar el informe.
**Prueba:** simulación de lectura de cola principal con 0 operaciones de escritura.

### ALTO — datos de otro contexto en exportación y vista previa
**Archivos:** `excel-control-lab.js`.
**Correcciones:** exigir perfil activo y módulo autorizado; invalidar la consulta ante cambios de rol, módulos, facultades o sesión; limpiar la vista previa al cambiar el acceso.
**Restricción:** el control final de permisos siempre corresponde a RLS/RPC del servidor; el cliente no reemplaza controles de backend.

### ALTO — lectura de fotografías y adjuntos con fallos silenciosos
**Archivo:** `index.html` del laboratorio.
**Correcciones:** sólo imágenes `data:image/jpeg/png/gif/webp/bmp;base64,...` se muestran en visor y se envían al generador PDF; se descartan URLs o MIME no previstos del visor. Límite 20 MB por archivo y 60 MB por carga; rechazo de fotografías de resolución excesiva, validación de dimensión y contexto de Canvas, manejo de abortos y errores de FileReader y de compresión; error visible en envío de formularios. Se toleran adjuntos históricos inválidos sin hacer fallar toda la tabla.
**Limitación:** las fotos reales y la generación de PDF deben someterse a pruebas de calidad y tamaño en dispositivos Android/iPhone.

### MEDIO — cálculos y exportaciones
**Archivo:** `excel-control-lab.js`.
**Correcciones:** evitar duplicación de informes por ID; no fusionar registros distintos sin ID, evitar contar el mismo riesgo dos veces dentro de un hallazgo; conservar descripciones de hasta 32.000 caracteres sin Unicode inválido; adjuntar temporalmente enlace de descarga al DOM para mejorar compatibilidad móvil. Accidentes, verificación formal, reincidencia y notificaciones no confirmadas se mantienen como «Sin datos».

## Pruebas de lógica efectuadas
- 15/15 verificaciones directas sobre reglas de fecha (incluido febrero bisiesto), acciones, evidencias, cierre, permisos, prevención de mezcla APR/OTROS, identidad y actividad.
- 11/11 pruebas anteriores de casos de exportación, sesión y cálculo.
- 5/5 comprobaciones del lector canónico de IndexedDB con transacción exclusivamente `readonly`, cierre de conexión y sin escrituras; se comprobó que la copia secundaria no duplicara el borrador.
- Controles estáticos de sintaxis en 25 módulos JS de v258 y 9 scripts embebidos, estilos CSS sin llaves desbalanceadas y sin IDs HTML estáticos repetidos.
- Prueba de Unicode extenso (32.000 caracteres) y estructura ZIP/XLSX mínima; falta apertura del archivo en Microsoft Excel.
- Los ensayos se realizaron con datos inventados/mocks para evitar afectar usuarios reales.

## Riesgos pendientes y bloqueos de aprobación
1. **Funcionalidad en navegador con usuarios reales de prueba:** iniciar y cerrar sesión; roles APR/OTROS, supervisor y administrador; cambiar permisos durante una edición; cambiar módulos; probar formularios y botones.
2. **Integridad real de almacenamiento:** simular caída de navegador, cuota llena, cierre forzado, cambio de cuenta, concurrencia entre pestañas, reemplazo de informes, restauración JSON, adjuntos grandes; verificar el IndexedDB real.
3. **PDF:** probar A4 multipágina, fotos, encabezados, impresión, descarga, compartir y archivo posterior con y sin conexión.
4. **Excel:** abrir en Excel de escritorio y móvil, probar filtros, reportes históricos grandes, referencias de riesgos y descarga en iPhone Safari; las estructuras básicas ZIP no reemplazan esa verificación.
5. **Supabase y permisos:** auditar RLS, RPC, Edge Functions, inserciones y lectura autorizada desde un entorno de prueba sin modificar producción. La versión base tiene sincronización central de informes deshabilitada. No se realizó una validación end-to-end de base de datos.
6. **Offline:** aún no tiene Service Worker, manifiesto ni recursos empaquetados de modo autónomo. CDNs de PDF/Supabase y verificación de acceso requieren conexión. La cola local no equivale a sincronización al volver Internet.
7. **Notificaciones y cierre:** no declarar entregas, verificaciones o cierres confirmados cuando el servidor no los respalda.

## Decisión
No fusionar el laboratorio con Work/main/producción ni anunciar “sin errores” sin completar los ensayos prácticos. Mantener activación central deshabilitada en el laboratorio. Próximo paso: validar presencialmente flujos de usuarios APR y OTROS, guardado, Excel y PDFs; luego iniciar la ingeniería offline en una rama aparte.

## Archivos nuevos o modificados en esta copia
`v258-excel-lab/index.html`, `v258-excel-lab/cloud-v242.js`, `v258-excel-lab/storage-v242.js`, `v258-excel-lab/excel-control-lab.js`, `v258-excel-lab/config-v242.js`, `v258-excel-lab/excel-control-lab.css`; el directorio `v258-review` es de sólo referencia y no se alteró.
