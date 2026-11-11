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


## Otras ramas históricas archivadas en `main`

| Fecha | Carpeta en `respaldos/` | Procedencia |
| --- | --- | --- |
| 2026-10-26 | `preparacion-v1/` | Rama `preparacion-v1` (instantánea histórica) |
| 2026-11-03 | `v233-admin-users-rama-original/` | Rama `desarrollo/v233-admin-users` (instantánea histórica) |
| 2026-11-05 | `v248-rama-original/` | Rama `desarrollo/v248` (revisión atípica sin carpeta v248 propia) |
| 2026-11-06 | `v258-excel-lab-integracion/` | Rama `desarrollo/excel-v258-integracion-pruebas` |
| 2026-11-06 | `v258-excel-lab-auditoria/` | Rama `desarrollo/excel-v258-auditoria-offline` |
| 2026-11-09 | `informes-historial/` | Rama `informes/historial-2026-11-09` |

La rama `respaldo/orden-historico-2026-11-11` ya contiene las mismas carpetas por fecha que `main` antes de las variantes adicionales; se conserva su historial. Las demás ramas originales continúan disponibles porque una copia en `main` no elimina ni fusiona automáticamente una rama Git.

**Uso recomendado en Visual Studio Code:** trabajar en `main` únicamente para consultar `respaldos/`; para corregir código crear una versión de desarrollo nueva y separada. Para ver copias recientes usar `git fetch origin` seguido de `git pull --ff-only origin main` únicamente cuando no existan cambios locales pendientes. Nunca usar `git reset --hard` para actualizar respaldos.

**Pendiente:** v333 y v334 no están presentes en las ramas disponibles de este repositorio remoto; localizar los originales antes de agregarlas.
