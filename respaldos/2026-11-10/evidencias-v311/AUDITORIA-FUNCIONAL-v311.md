# Reportes HYS — Auditoría funcional y correcciones v311

**Fecha:** 10 de noviembre de 2026  
**Rama exclusiva:** `desarrollo/v311-auditoria-correcciones`  
**Base protegida:** v310, commit `71bcb6d1224be7bff760fb16a79e7bad5a734642`  
**Estado:** Desarrollo para revisión, no publicado. Sin cambios en `main`, versiones previas ni producción/Supabase.

## Alcance comprobado

- Integridad de la interfaz avanzada: 111 archivos, 57 módulos JavaScript sujetos a comprobación de sintaxis.
- Flujo Flash Report → revisión → devolución → corrección → aprobación.
- Acceso a Final Report después del envío válido de Flash; envío/cierre condicionado.
- Cinco categorías del punto 9, con 153 códigos y descripciones originales de `HSS-RGT-007-Flash_Final Report rev.8.xlsx`; SHA-256 del libro maestro: `f569f11598bef56ffed255f84bd9840d72e119431fa8cfe5b71bb974d1337a8e`.
- Punto 10: campo `CÓDIGOS` como texto libre; filas incrementales de planes.
- Búsqueda de revisores, privacidad de directorio, facultades históricas del Administrador, permisos existentes APR/OTROS y regresión de formularios.

## Hallazgos corregidos

| Código | Prioridad | Incidencia verificada en base | Corrección v311 |
|---|---|---|---|
| AUD-311-01 | Alta | Final Report podía pasar a revisión vacío después de un Flash válido. | Mínimos provisionales antes del envío, aviso por campo y borde rojo; los borradores incompletos siguen permitidos. |
| AUD-311-02 | Media | La validación de fechas aceptaba valores normalizados como `2026-02-30`. | Comprobación estricta de calendario, incluyendo años bisiestos, en Flash y Final. |
| AUD-311-03 | Alta | Final podía aprobarse tras correcciones del Flash usando antecedentes de una revisión Flash anterior. | Control de revisión de origen; se obliga a devolver, actualizar y reenviar Final antes de aprobarlo. |
| AUD-311-04 | Alta | Tras guardar Final con planes 4, 5 o superiores, al reabrirlo el contador interno generaba otros nombres y podía dejar esos planes sin restaurar. | Identificadores deterministas basados en filas presentes; prueba guardar, reabrir, recuperar planes y agregar el siguiente. |
| AUD-311-05 | Media | El formulario permitía agregar más filas de planes que el límite de 40 admitido en su restauración. | Límite coherente de 40 planes, deshabilitación de «Agregar» al alcanzar el máximo y habilitación al limpiar o reiniciar. |
| AUD-311-06 | Media | El control de pendientes obligatorios solo identificaba en rojo el Flash. | Se extendió a los mínimos provisionales del Final, con resumen actualizado al corregir. |

**Nota:** los mínimos de Final se han implementado para no aceptar una investigación vacía **solo en el laboratorio**: involucrados, fecha, tipo, lugar/área, relato, equipo investigador, al menos una causa y al menos un plan recomendado. La matriz definitiva de obligatoriedad debe validarse con H&S antes de habilitar envíos reales.

## Integridad del diseño acordado

- La interfaz histórica de «Permisos y facultades» permanece intacta; únicamente las casillas `closeFlashReport` y `closeFinalReport` en la lista especial del Administrador.
- No se restituyó ningún bloque paralelo de autorizados de cierre.
- Las causas oficiales se muestran en el punto 9 en sus grupos: 37 condiciones subestándar, 36 acciones subestándar, 25 factores del trabajo, 24 personales y 31 requerimientos del sistema.
- Punto 10 sigue **sin desplegable**: CÓDIGOS es entrada de texto libre.
- Las tarjetas APR/OTROS y los componentes preexistentes de almacenamiento, permisos y sincronización se conservaron.

## Verificación y límites

**GitHub Actions:** `qa-v311-investigacion.yml`, ejecución aprobada `42840234688` antes de registrar este informe. Incluye análisis sintáctico de 57 JavaScript, auditoría de fechas, Final y planes, pruebas DOM del flujo y reenvíos, comparación de catálogo, permisos y regresión de formularios.

La auditoría es **estática + pruebas simuladas en DOM (JSDOM)**. No sustituye una prueba de integración con sesiones reales. Se intentó comprobación visual automatizada del catálogo en navegador, pero el servicio externo no permitió iniciar la sesión; por tanto la validación visual completa sigue pendiente.

## Pendientes que no se deben declarar operativos

1. **No hay persistencia real** de Flash, Final, revisiones, adjuntos, trazabilidad ni notificaciones de investigación.
2. **No se guardan nuevas facultades de cierre en Supabase**: backend de permisos y verificación de autorización servidor pendientes.
3. **Directorio de revisores para usuarios básicos** pendiente de endpoint de mínima exposición y RLS; la búsqueda actual no habilita envíos reales.
4. **Firmas y aprobaciones oficiales** requieren verificación de identidad y auditoría transaccional.
5. **Validación final de campos obligatorios** con el responsable H&S antes de producción.
6. Revisión visual en navegador y en dispositivos móviles con cuentas de prueba.

**Conclusión:** v311 es una copia de desarrollo funcionalmente más segura y con regresión automatizada aprobada. No está lista para publicación ni para cargar incidentes reales.
