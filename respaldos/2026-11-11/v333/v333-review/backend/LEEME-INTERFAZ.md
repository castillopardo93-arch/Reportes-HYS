# Reportes HYS v333 · Cierre del informe diario e investigación local

Desde la carpeta que contiene `v333-review`:

```sh
npm ci --prefix v333-review/backend
npm start --prefix v333-review/backend
```

Abrir `http://127.0.0.1:8177/` en el mismo equipo. Dentro de la tarjeta, usa **Ingresar a informes** con una de estas cuentas ficticias:

| Cuenta | Clave de prueba | Acceso a informes |
|---|---|---|
| `elaborador` | `prueba-elaborador` | Crear, recuperar y cerrar sus propios informes en ambas tarjetas. |
| `consulta-apr` | `prueba-consulta` | Consultar y descargar informes cerrados del área Eléctrica en Prevencionistas. |
| `otro-elaborador` | `prueba-otro` | Elaborar sus propios informes del área Mecánica en Prevencionistas. |

La sesión dura 30 minutos y se invalida al reiniciar el servidor. El acceso a Investigación sigue usando su selector de identidades ficticias por separado.

1. Ingresa a **Prevencionistas** o a **Supervisores/Capataces u otros**. Completa los datos de prueba y agrega una actividad o un hallazgo con una fotografía ficticia, según la tarjeta.
2. Pulsa **Guardar en base local**. La confirmación indica la revisión devuelta por PostgreSQL.
3. Cierra la pestaña, vuelve a ingresar y pulsa **Recuperar último borrador de la base**. Confirma la apertura y comprueba la actividad y la fotografía.

4. Pulsa **Generar PDF** para revisar el contenido. Pulsa **Finalizar informe** y confirma. El servidor local guarda la revisión final y su PDF juntos.
5. Si la conexión falla justo al cerrar, vuelve a pulsar **Finalizar informe** en esa misma sesión para comprobar el resultado del intento. Si ya cerraste la pestaña, consulta **Reportes anteriores**.
6. Vuelve a ingresar y selecciona **Reportes anteriores**. Busca el informe cerrado, abre o descarga su PDF y consulta el evento de cierre.

El recorrido de elaboración en ambas tarjetas usa la cuenta ficticia `elaborador`. Cada tarjeta consulta sus propios borradores y reportes cerrados. El JSON de cada solicitud tiene un límite de 7,1 MB, incluidas las fotos y, al finalizar, el PDF codificado. Para generar PDF en el navegador se requiere acceso a la biblioteca jsPDF 2.5.1 que ya utiliza la interfaz.

Para probar expedientes, elige **Investigación de accidente** en la cinta lateral.

1. Con **Elaborador ficticio**, abrir Flash o Final y guardar un borrador.
2. Seleccionar evidencias en las casillas originales. Pulsar **Subir archivos seleccionados**. Fotografías admite PNG o JPEG. Los documentos de referencia, matriz y capacitación admiten también PDF. Máximo 5 MiB por archivo y 20 evidencias activas por documento.
3. Los archivos guardados aparecen bajo su casilla. **Ver / descargar** abre la imagen o habilita la descarga de PDF. **Eliminar** requiere un motivo y conserva el registro de eliminación.
4. Buscar un revisor por nombre y pulsar **Enviar a revisión**. El servidor valida los campos requeridos y la autorización del destinatario.
5. Cambiar a **José Revisor ficticio**, abrir el expediente, escribir observaciones y pulsar **Devolver para corregir**. Volver al elaborador, corregir y reenviar. El revisor puede **Aprobar revisión**.
6. Cambiar a **Cierre autorizado ficticio**, abrir el documento aprobado y cerrarlo con motivo. Cada operación se registra en el historial.
7. Desde la lista, **Crear Final asociado** o **Crear Flash asociado** reutiliza el expediente correspondiente cuando falta el otro formulario. Final puede guardarse incompleto. Su envío requiere Flash enviado y su aprobación exige Flash aprobado o cerrado con revisión compatible.
8. Si Flash cambia después de enviar Final, el servidor bloquea la aprobación de Final. Devolver Final, actualizar sus antecedentes y completar el motivo de reconciliación antes de reenviarlo.

Las cuentas son identidades ficticias del laboratorio, seleccionables únicamente para comprobar el circuito local. El selector no constituye un sistema de autenticación para uso operativo. El servidor acepta solo esas identidades y ejecuta cada solicitud bajo sus permisos SQL dentro de una transacción.

Los datos ficticios se conservan en `.reportes-hys-v333-laboratorio` dentro del directorio del usuario. Detener con Ctrl+C y volver a iniciar mantiene los expedientes. No ingresar información personal ni documentación real.

La verificación de archivos comprueba tamaño, tipo declarado y firma básica. No sustituye un analizador completo ni un antivirus. Word y Excel quedan pendientes de un flujo específico de validación. Los otros módulos administrativos y los informes diarios conservan sus dependencias de integración.

## Pruebas y migraciones

```sh
npm test --prefix v333-review/backend
```

La suite usa bases temporales en disco y la interfaz avanzada por HTTP con JSDOM. Los resultados y límites de verificación se registran en `evidencias-v333/AVANCE-v333.md`. Para ejecutar también el recorrido PDF, instala las herramientas Poppler (`pdfinfo`, `pdfimages` y `pdftotext`) y proporciona la ruta al archivo UMD de jsPDF 2.5.1 mediante la variable `HYS_JSPDF_251`.

La migración `003-evidencias-revision.sql` añade clasificación por campo, PDF, carga idempotente y filtro de revisores por área efectiva. Una base local previa con las migraciones 001 y 002 aplica la 003 al iniciar. Para una base desechable, ejecutar las reversiones en orden 003, 002, 001 después de exportar sus datos. La reversión 003 retira la RPC nueva y conserva columnas compatibles. Estas migraciones no se han aplicado al proyecto oficial.

La migración 008 aplica permisos por fila únicamente al PostgreSQL local. Las cuentas y su alcance siguen siendo ficticios.

La migración 009 aplica el alcance por área al PostgreSQL local. Una revocación bloquea las consultas y descargas posteriores aunque el token de sesión siga vigente.

Para exportar un Flash o Final, guarda el documento y pulsa **Descargar PDF** en su formulario. La fecha del incidente y los involucrados se toman del expediente. Cuando hay varios, sepáralos con saltos de línea, barras o punto y coma al escribirlos. Las barras se convierten en guiones entre personas en el nombre descargado. El PDF de prueba incluye los campos del documento. Los adjuntos siguen disponibles por separado.
