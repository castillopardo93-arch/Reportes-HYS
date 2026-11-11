# Reportes HYS v307 — Flash Report / Final Report

Copia de desarrollo desde v306 (commit `3858aec63dc2310ae2e430c72fdfcbad8904bc9b`). No modifica la rama de origen, main ni producción.

Se hacen selectores explícitos de área en ambos informes. Los cinco grupos de causas y los planes de acción en Final Report ahora permiten seleccionar códigos 1.x, 2.x y 3.x según rangos respaldados por `evidencias-v306/mapa_excel_hss_rgt_007.json`. Las descripciones completas de las causas y todos los rótulos originales del libro aún requieren cotejo textual con el archivo HSS-RGT-007 Rev.08, que no está disponible como archivo accesible en esta sesión. No se han inventado descripciones.

La altura inicial de las narrativas baja a tres filas con crecimiento automático. Las casillas de fecha, hora, número y listas de rótulo corto se limitan de ancho; los campos de texto ordinarios ya no ocupan innecesariamente dos columnas. Los rótulos de v306 permanecen idénticos.

El guardado y escrituras en Supabase continúan deshabilitados. No ejecutadas las pruebas Node/DOM ni la comprobación visual v307 en navegador. Esta versión requiere validación antes de aprobación.
