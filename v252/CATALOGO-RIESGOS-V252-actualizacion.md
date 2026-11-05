# Reportes HYS — Catálogo de riesgos estandarizado (v252)

**Estado:** integrado solo en desarrollo, sin publicación ni conexión al catálogo central.  
**Base:** desarrollo/v251, copia independiente v252.  
**Módulos:** APR y OTROS; se conserva el mismo buscador de Hallazgos con selección múltiple.

## Qué incluye

- 393 riesgos estandarizados a partir del Excel **Listado_unico_de_riesgos.xlsx**.
- Los 495 textos originales quedan documentados en el Excel **Catalogo_Riesgos_Mejorado_Reportes_HYS.xlsx**, en EQUIVALENCIAS y REVISIÓN.
- Alias y palabras relacionadas (variantes de texto) para búsquedas sin tildes, con términos en distinto orden y errores menores.
- Selección guarda solamente el código y nombre del riesgo como instantánea del hallazgo; los cambios futuros no alteran el historial.
- Búsqueda única de riesgos, **sin botón de actividad/hoja**.
- Catálogo precargado al abrir v252 cuando todavía no existe una importación local.
- Resultados ordenados por relevancia, y catálogo inicial/actualizaciones ordenados alfabéticamente.

## Cómo actualizar ahora (versión de desarrollo)

1. Abrir `v252/index.html` e iniciar sesión con rol **administrador general**.
2. Entrar a APR u OTROS → Informe Diario → Hallazgos → Agregar o Editar.
3. Abrir el selector de riesgos existente. La opción **«Actualizar catálogo (JSON/CSV)»** solo aparece al administrador general.
4. Seleccionar un archivo **JSON** compatible (recomendado) o **CSV** con columnas `codigo,nombre`. Para conservar alias y palabras relacionadas usar JSON.
5. La app valida registros, rechaza códigos repetidos y archivos defectuosos, ordena por descripción y guarda la actualización **solo en el navegador y módulo de prueba actual**. Los riesgos históricos de cada hallazgo se conservan.

**Formato JSON de actualización:**

```json
{
  "version": "2026-11-05.2",
  "risks": [
    {
      "code": "R0001",
      "name": "Descripción oficial del riesgo",
      "aliases": ["Otra forma de escribirlo"],
      "keywords": ["Término relacionado"]
    }
  ]
}
```

### Limitaciones deliberadas

- **No admite archivos .xlsx directamente** en el botón de esta versión: el Excel debe convertirse a JSON/CSV antes de importarlo.
- Esta actualización no sincroniza automáticamente otros equipos, otros navegadores, otras cuentas o módulos.
- Los roles no administradores solo seleccionan riesgos; no disponen de carga desde la interfaz.
- La versión central futura usará Excel maestro, revisión/validación y catálogo Supabase versionado, sin modificar los informes históricos.
- No activar escritura real de Supabase ni sustituir `main` sin autorización.

## Pruebas

13 de 13 pruebas de regresión de v252 satisfactorias: catálogo, códigos únicos, búsquedas flexibles, tildes, alias, importación válida/atómica, orden alfabético, instantáneas históricas, rol de carga y ausencia de un segundo buscador.

**Archivos principales:** `risk-seed-v252.js`, `risk-catalog-v243.js`, `index.html`, `test-risks-v252.cjs`.
