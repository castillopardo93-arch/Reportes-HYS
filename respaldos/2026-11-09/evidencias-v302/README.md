# Reportes HYS — Auditoría integral v302

Fecha: 9 de noviembre de 2026. Base: rama `desarrollo/v301-permisos-facultades-acceso-rapido`, commit `5f0a5fba705029d525602815809d68a5858e81d0`.

## Alcance
Auditoría del efecto de la quinta pestaña **Permisos y facultades** sobre el gestor de usuarios, otras cuatro pestañas, inicio de sesión, cambio de tarjeta, historial, avisos, PDF y fotos, riesgos, tareas pendientes y guardado central. Se aplican pruebas de dependencias de recursos, análisis sintáctico de JavaScript, aislamiento de 94 archivos y ensayos de DOM en escenarios favorables y adversos.

## Hallazgos y correcciones preventivas
1. **Lectura de facultades con error oculto:** el gestor consideraba `faculty.error` equivalente a `faculties=[]`. Si falla una consulta por red/RLS, la pantalla podría mostrar a un administrador autorizaciones incorrectamente vacías. Ahora se bloquea el estado nuevo y se muestra error.
2. **Revocación de sesión durante cargas asíncronas:** la respuesta podía aplicarse incluso tras cambiar el actor/rol si aún no llegaba una sincronización visual. Ahora se revalida identidad/rol antes de incorporar cada conjunto de datos y antes de abrir un editor.
3. **Historial incompleto como vacío:** se convertían fallas de auditoría parcial en listas aparentemente completas. Ahora se informa del error.
4. **Confirmación atómica de lectura:** no se publican usuarios/áreas/facultades si el historial falla o la sesión cambia durante cualquier paso.

## Requisitos conservados
- Quinta pestaña ubicada **junto a** las otras cuatro opciones de Gestión de usuarios; ni menú lateral nuevo ni asistente de creación.
- Editor reutiliza las reglas de roles, tarjetas, áreas y facultades.
- Los usuarios globales quedan excluidos de modificaciones accidentales por esa pestaña.
- Los cambios son **propuestas, no permisos reales**; botón de guardar central desactivado.
- El número de versión solo se presenta al elegir tarjeta.
- Escritura central desactivada en tres banderas; ninguna operación SQL de cambio a producción.

## Verificaciones
- `evidencias-v302/test-auditoria-integral-v302.cjs`
- `.github/workflows/qa-v302-auditoria-integral.yml`
- Regresiones automatizadas v301 a v284.

## Límites
Las pruebas son automatizadas y sin usuario real. Una auditoría estática y DOM no puede asegurar el comportamiento de todos los navegadores, los datos reales del servidor ni la recuperación de PDF real con RLS. Esa validación queda pendiente. La v301 y todas las versiones protegidas permanecen intactas.

## Resultado confirmado de la ejecución automatizada

- **50 pruebas nuevas v302:** aprobadas (recursos, sintaxis, DOM, permisos rápidos, fallas de RPC/RLS, rol revocado, identidad sustituida, auditoría incompleta y ausencia de escrituras).
- **422 pruebas de regresión anteriores:** aprobadas (v301–v284).
- **Total: 472 pruebas aprobadas.**
- Primera ejecución verde para el código auditado: [GitHub Actions #42664056492](https://github.com/castillopardo93-arch/Reportes-HYS/actions/runs/42664056492).
- **90 archivos originalmente no intervenidos** conservados sin diferencias de bytes.
- `v301-review` permanece inalterada; `v302-review` se mantiene como copia separada.
- Las primeras ejecuciones de v302 detectaron problemas en la prueba de sustitución de identidad y una espera asíncrona del entorno de ensayos. Se corrigió la protección de apertura del editor y se estabilizó el ensayo, y después pasó la batería íntegra.

## Evaluación final y próximos riesgos

| Prioridad | Verificación | Estado |
|---|---|---|
| Alta | Facúltades devueltas vacías por un error de Supabase/RLS | Corregido: se bloquea el flujo y se muestra el error |
| Alta | Sustitución de sesión / pérdida de rol durante carga administrativa | Corregido: revalidación antes de mostrar la información |
| Media | Lectura de auditoría parcial aceptada sin advertencia | Corregido: resultado incompleto no se acepta |
| Media | Estado de usuarios, áreas, facultades e historial actualizado a mitad de lectura | Corregido: publicación atómica al final |
| Informativo | Integridad de PDF, fotos, riesgos, notificaciones, guardado y navegación | Sin regresiones detectadas en pruebas y módulos intactos |
| Pendiente | Autenticación real en navegador y pruebas de roles con servidor | No verificado; requiere entorno de confianza |
| Pendiente | Sincronización y guardado central de permisos | Bloqueado deliberadamente, requiere autorización y operación auditada |
| Pendiente | Corrección en RPC v242 del caso `history` en ruta `noop` | Requiere migración específica aprobada |

**Conclusión:** el cambio introducido en v301 preserva el flujo previo en los ensayos automatizados. v302 incorpora resguardos adicionales. No es una certificación de producción ni una prueba funcional con datos reales.
