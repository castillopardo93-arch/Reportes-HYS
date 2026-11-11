# Índice histórico de respaldos — Reportes HYS

Este directorio conserva **la estructura preexistente** `respaldos/AAAA-MM-DD/` de la rama principal.
Las carpetas originales del 26 al 30 de octubre de 2026 permanecen intactas.

## Respaldos incorporados (copias, no traslados)

| Fecha de referencia (Chile) | Versiones archivadas |
| --- | --- |
| 2026-11-03 | v237, v238 |
| 2026-11-04 | v239, v240 |
| 2026-11-05 | v241–v253 (incluye variantes v247/v248 conservadas tal como existen en sus ramas) |
| 2026-11-06 | v254–v259 |
| 2026-11-07 | v260–v261 |
| 2026-11-08 | v262–v284 |
| 2026-11-09 | v285–v307 |
| 2026-11-10 | v308–v312 |

Las fechas agrupan versiones según la fecha de referencia del historial Git disponible; **no sustituyen** la fecha de creación original de cada archivo o versión. Para auditar una fecha exacta, consultar el historial de la rama de origen.

Se copiaron las carpetas de aplicación y las de evidencia disponibles, sin sobrescribir el historial de cada rama. Algunas versiones tempranas no tienen un directorio numerado propio en el último árbol y sus estados/variantes se conservaron conforme a los objetos de Git existentes. La rama `main` no incorpora cambios de lógica ni de despliegue: el cambio se limita a `respaldos/`.

### Convenciones
- `vNNN-review/`: copia de desarrollo/revisión de una versión.
- `vNNN/`: copia de versión cuando esta carpeta existe.
- `evidencias-vNNN/`: pruebas y reportes de auditoría disponibles.
- `v266-avance-formulario-usuarios/` y `v248-workspace-v247/`: variantes paralelas, conservadas para no perder trabajo.
- Las ramas originales `desarrollo/*` siguen siendo la referencia de historial y permanecen sin modificaciones.

### Estado de v333 y v334

A 2026-11-11, **no se identificaron ramas ni carpetas v333/v334** en este repositorio remoto conectado. No se deben inventar respaldos para esas versiones. Antes de incorporarlas, localizar sus fuentes reales (posiblemente en otro repositorio o exclusivamente en el computador local) y comprobar su integridad.

### Protección
No modificar copias históricas. Para cada nuevo respaldo, agregar una subcarpeta en la fecha correspondiente sin alterar carpetas anteriores. No confundir archivar una versión con aprobarla o publicarla.
