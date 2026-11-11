# Reportes HYS — Auditoría integral v260 (07-11-2026)
**Base:** `desarrollo/v259` (`b2aa13465d9a9b50a950106257204a4010b5b943`).
**Auditoría previa:** `desarrollo/auditoria-integral-v259` (`39da8b58a85c6dc83d6c2c5155b27f1529a7ffc3`).
**Rama de destino:** `desarrollo/v260-auditoria-integral`. **Copia:** `v260-review`.
**Exclusión expresa:** no evaluar ni desarrollar funcionamiento sin conexión/PWA.
**Control de cambios:** no tocar `main`, `v259-review`, respaldos, cuentas, roles, políticas, Edge Functions ni datos de producción.

## Alcance y comprobaciones efectuadas
- 26 módulos JavaScript: análisis sintáctico individual satisfactorio (5 modificados y 21 heredados).
- 9 scripts internos del HTML: sintaxis válida; 45 referencias JS/CSS locales presentes.
- 19 archivos CSS: conteo de bloques equilibrado, no equivale a renderizado visual.
- HTML: no se encontraron identificadores `id` duplicados.
- 20 aserciones ejecutadas en un entorno JS aislado: 20 aprobadas, 0 fallidas. Cubren permisos en ambos módulos, rol y estado, control de facultades, alcance de áreas, revisión lógica de revocaciones, integridad de copia, segregación APR/OTROS, rechazo de adjuntos inválidos y cola de guardado.
- Se revisaron rutas de administración, generación de PDFs, fotografías, historial, visor, permisos, guardado local y preparación de sincronización. La inspección de código NO sustituye una ejecución integral autenticada.

## Correcciones integradas a la copia v260
1. `access-settings-v259.js`: al delegar áreas se exige módulo vigente; al conceder edición se exige módulo autorizado, perfil administrador, lectura y escritura. Son controles preventivos de UI, no reemplazan autorización de servidor.
2. `operaciones-v242.js`: corregido elemento HTML inválido en el filtro de rol «Usuario».
3. `index.html`: robustecida la lectura de adjuntos históricos; validación explícita de imágenes base64 compatibles para visor/PDF; controles de tamaño/procesamiento de nuevas imágenes y errores de lectura/compresión; conservar área histórica al editar; retirada etiqueta antigua «v242 · PDF revisado».
4. `cloud-v242.js` y `storage-v242.js`: nombres propios `hys-v260-auditoria` para separar almacenamiento, cola y autenticación del laboratorio de las versiones previas.
5. `config-v242.js`: gestión de cuentas desactivada **solamente en este laboratorio**. Los informes centralizados continúan inactivos conforme a la base previa; ninguna operación remota de escritura fue ejecutada en la auditoría.

## Interacción entre funciones: resultados y límites
| Grupo | Prueba realizada | Resultado |
|---|---|---|
| Identidad/permisos/facultades | 12 aserciones sobre alcance, roles y permisos, con funciones reales y contextos simulados | Aprobadas |
| Planificación de facultades | 3 aserciones: revocación antes de acceso, plan vacío y normalización | Aprobadas |
| Datos APR/OTROS y adjuntos | 3 aserciones de aceptación/rechazo de paquetes | Aprobadas |
| Cola de guardado | 2 aserciones: confirmación antes de borrar y conservación de pendientes al fallar | Aprobadas |
| Formularios y gestión de usuarios | Revisión estática y coherencia de referencias; falta sesión real | Parcial |
| Fotografías y visor | Análisis estático y correcciones defensivas; falta prueba de archivos físicos/dispositivos | Parcial |
| PDF, multipágina, impresión y compartición | Dependencias y referencias revisadas; faltan documentos reales y pruebas visuales | Pendiente prueba E2E |
| Historial/reapertura/revisión | Rutas revisadas; faltan pruebas reales de servidor y roles | Pendiente prueba E2E |
| Auditoría, RLS, permisos efectivos remotos | Hallazgos de auditoría v259 leídos; no se modificó ni ejecutó backend real | Pendiente prueba E2E |

## Riesgos relevantes que aún impiden aprobación
- **ALTO: operaciones administrativas no atómicas.** `facultades-v242.js` ejecuta `hys242_guardar_usuario` y `hys242_asignar_facultades` en una secuencia. Un fallo intermedio podría dejar cambios parciales. Se requiere una transacción de backend o mecanismo coordinado probado. No simular atomicidad con rollback de navegador. La administración está desactivada en esta copia para no exponer cambios remotos durante auditoría.
- **ALTO: autorización remota no demostrada.** Las pruebas se hicieron sin cuentas de prueba reales. Validar matrices de roles y revocación en servidor con un entorno aislado.
- **MEDIO: falta prueba visual integral.** Verificar ciclos completos de formularios, cierre, edición, fotos, PDF, imprimir, archivos anteriores y cambios de pestaña en escritorio y móvil.
- **MEDIO: capacidades de seguimiento avanzadas aparecen expresamente bloqueadas a falta de proveedores backend**; no presentarlas como plenamente funcionales.
- **SEPARADO DEL ALCANCE:** modo sin conexión y PWA, pendiente para fase posterior por instrucción del usuario.

## Estado de salida
**v260 en auditoría, no aprobada, no publicada.**
La sintaxis y reglas puras pasan, pero no se garantiza ausencia total de defectos. Es indispensable una prueba de integración de extremo a extremo con datos y usuarios de ensayo antes de promover o habilitar administración.
