# Reportes HYS — v310 (desarrollo aislado, no publicado)

**Corrección aprobada:** recuperar el diseño original de **Administrador General → Gestión de usuarios → Permisos y facultades**. No crear una nueva pantalla, tabla, ventana modal ni bloque para los cierres de investigación.

En la lista existente **«Facultades de Administrador (por tarjeta)»** aparecen dos casillas nuevas, junto a las facultades históricas:

- **Autorizar cierre de Flash Report** (clave interna: `closeFlashReport`)
- **Autorizar cierre de Final Report** (clave interna: `closeFinalReport`)

También se presentan en la lista de la ventana histórica **«Facultades de acceso»**, que utiliza el mismo catálogo de facultades especiales. La presentación, orden de las pantallas, áreas y restantes controles no se modificó. Se eliminó de esta versión el bloque independiente **«Investigación de accidente — Autorizados de cierre»** añadido indebidamente en v308–v309.

Las nuevas facultades son **opcionales**, independientes entre sí, y están desmarcadas por defecto. Solamente el Administrador General puede proponerlas para un usuario con rol **Administrador** y con tarjeta/área autorizada; retirar la facultad de consulta también revoca los permisos de cierre. Pueden concederse a varias cuentas desde sus fichas existentes. No se ha añadido un campo nuevo de designación de responsable.

**Límite de operación:** estas opciones se pueden revisar y preparar en la interfaz de desarrollo; **no se guardan ni se aplican en Supabase**. La autorización efectiva de un cierre real sigue pendiente de verificación del permiso en el servidor, asignación al expediente y auditoría. La simulación de aprobaciones sigue siendo ficticia y no concede facultades reales.

El resto de la aplicación avanzada sigue integrado desde v309: Flash Report, Final Report, seguimiento, buscador de revisores, catálogo de **153 causas** con nombre en el punto 9 y campo **CÓDIGOS** sin desplegable en el punto 10.

Rama: `desarrollo/v310-facultades-cierre-lista`. Copia aislada de la v309 (`05b085507c059022ee3c4e504447e437511c52b8`). **No se modificaron** v309, v308, otras versiones protegidas, `main`, aplicación oficial ni Supabase.

Verificaciones: `.github/workflows/qa-v310-investigacion.yml`, incluyendo regresión de la interfaz original y prueba de las dos claves nuevas, roles permitidos, validaciones, catálogo y flujo de investigación.
