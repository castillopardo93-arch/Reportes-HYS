# Cambio de proyecto único — Reportes HYS v245

**Fecha:** 2026-11-05 · **Solicitud del usuario:** eliminar «PHAM 1» y «PHAM 2» en **ambas tarjetas APR y OTROS** y dejar una sola opción, con ortografía y capitalización correctas:

**Proyecto Hidroeléctrico Alto Maipo**

## Implementación

- El selector de **Inicio → Proyecto** ofrece una sola opción preseleccionada, sin opción vacía. Se comparte en APR y en el formulario embebido de OTROS.
- `PROJECT_NAME_245` y `enforceProject245()` aplican esa misma opción después de cargar un borrador (`applyPack`), actualizar catálogos (`setCatalog`) y restablecer catálogos (`resetCatalog`). `blank()` utiliza el proyecto único.
- `pack()` y el PDF conservan su esquema; guardan el valor visible de `project`.
- No se reescriben directamente los archivos PDF ya archivados ni los archivos históricos externos. Al abrir un borrador antiguo, el selector de **la nueva edición** muestra únicamente el proyecto autorizado.
- No se modificó ninguna base de datos ni permisos reales.

## Seguridad y continuidad

La aplicación oficial (`main`) y las ramas anteriores `desarrollo/v243`, `desarrollo/v244` permanecen intactas. El cambio aplica a `desarrollo/v245` y la demostración `v245-review`, sin conectar Supabase.

## Pruebas

`node --test v245/test-proyecto-unico-v245.cjs` comprueba la opción única, la ausencia de PHAM 1/2, protección ante restauración/catálogos y conservación del PDF. Se recomienda revisión visual manual en APR y OTROS para validar ambos selectores.
