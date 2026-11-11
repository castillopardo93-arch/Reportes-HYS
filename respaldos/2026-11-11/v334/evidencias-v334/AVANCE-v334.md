# Reportes HYS v334

Rama local `desarrollo/v334-cierre-y-borrador`, basada en v333 (`dacde0d`).

Durante la revisión manual de v333 se observaron dos entradas en el historial y un formulario que permanecía lleno. El código de v333 confirmaba el cierre y aplicaba el estado «Finalizado» al formulario con sus datos intactos. Además, guardaba la revisión de PostgreSQL solo en memoria, por lo que la perdía con F5 aunque el formulario se recuperara del navegador. No se inspeccionaron los dos registros existentes del equipo del usuario, por lo que su origen preciso no quedó determinado.

v334 conserva en la sesión de la pestaña la última revisión confirmada, separada por cuenta, tarjeta e identificador. «Guardar en base local» confirma también la copia del navegador cuando el formulario no cambió durante la solicitud. Después del cierre confirmado y si no hubo cambios posteriores, sustituye el borrador activo por uno nuevo con ID distinto. Este paso evita volver a archivar el informe y dirige a Inicio con la confirmación visible. Si el guardado del formulario nuevo falla o hubo cambios durante el cierre, conserva el formulario y explica el resultado.

La prueba de ambas tarjetas reproduce una recarga con la misma sesión y el mismo almacén del navegador. No pulsa «Recuperar último borrador». Comprueba que el cierre usa el ID original, queda una sola entrada aunque haya dos peticiones concurrentes, un segundo clic en el formulario vacío no crea otra entrada y el PDF cerrado se conserva tras reiniciar el servidor.

La v334 usa una carpeta de datos independiente. Los registros que ya existían en v333 se conservan en su carpeta original. Esta revisión no elimina duplicados previos, no publica y no modifica Supabase oficial.

Pasaron 25 de 25 pruebas locales y 24 de 24 suites de regresión (tres históricas).
