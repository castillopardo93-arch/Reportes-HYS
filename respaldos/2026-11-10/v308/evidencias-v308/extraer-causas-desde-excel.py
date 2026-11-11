#!/usr/bin/env python3
"""Genera un catálogo estático de causas HSS-RGT-007 para Reportes HYS v308.

Ejecución ADMINISTRATIVA única (no es función de usuario):
  python evidencias-v308/extraer-causas-desde-excel.py /ruta/HSS-RGT-007-Flash_Final Report rev.8.xlsx

Lee únicamente el libro de origen; no modifica el .xlsx ni Supabase.
Rechaza resultados incompletos, ambiguos o con descripciones insuficientes.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

EXPECTED = {"1": 73, "2": 49, "3": 31}
SOURCE_NAME = "HSS-RGT-007-Flash_Final Report rev.8.xlsx"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
OUTPUT = Path(__file__).resolve().parent.parent / "v308-review" / "causas-datos-v308.js"


def content_text(node: ET.Element) -> str:
    return "".join((t.text or "") for t in node.iter() if t.tag.split("}")[-1] == "t").strip()


def root_xml(zip_file: ZipFile, name: str) -> ET.Element:
    if name not in zip_file.namelist():
        raise ValueError("Falta sección en libro original: " + name)
    return ET.fromstring(zip_file.read(name))


def cols_number(ref: str) -> int:
    letters = re.match(r"^[A-Z]+", str(ref).upper())
    val = 0
    for ch in letters.group() if letters else "":
        val = val * 26 + ord(ch) - 64
    return val


def code_text(raw: str) -> tuple[str, str] | None:
    raw = " ".join(raw.replace("\u00a0", " ").split())
    m = re.match(r"^([123])\.\s*(\d{1,2})(?!\d)\s*[:.)–—\-]?\s*(.*)$", raw)
    if not m:
        return None
    code = m.group(1) + "." + str(int(m.group(2)))
    if 1 <= int(m.group(2)) <= EXPECTED[m.group(1)]:
        return code, m.group(3).strip(" .:-–—")
    return None


def valid_label(label: str) -> bool:
    label = label.strip()
    return 4 <= len(label) <= 500 and len(re.findall(r"[^\W\d_]", label, re.UNICODE)) >= 3


def parse(path: Path) -> dict[str, str]:
    if path.name != SOURCE_NAME:
        raise ValueError("Utiliza la plantilla original, sin renombrarla: " + SOURCE_NAME)
    with ZipFile(path) as z:
        book = root_xml(z, "xl/workbook.xml")
        rels = root_xml(z, "xl/_rels/workbook.xml.rels")
        sheets = [el for el in book.iter() if el.tag.split("}")[-1] == "sheet"]
        target = next((e for e in sheets if e.attrib.get("name", "").strip().lower() == "tabla"), None)
        if target is None:
            raise ValueError("No existe la hoja 'Tabla' del libro.")
        relid = target.attrib.get(REL) or target.attrib.get("r:id")
        relationship = next((e for e in rels.iter()
                            if e.tag.split("}")[-1] == "Relationship" and e.attrib.get("Id") == relid), None)
        if relationship is None:
            raise ValueError("No se encontró la hoja Tabla en workbook.xml.rels.")
        target_file = relationship.attrib.get("Target", "").lstrip("/")
        file_name = target_file if target_file.startswith("xl/") else "xl/" + target_file.removeprefix("../")
        if not re.fullmatch(r"xl/worksheets/[^/]+\.xml", file_name):
            raise ValueError("Destino no autorizado de hoja Tabla.")
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss = root_xml(z, "xl/sharedStrings.xml")
            shared = [content_text(e) for e in ss.iter() if e.tag.split("}")[-1] == "si"]
        sheet = root_xml(z, file_name)
        results = {}
        conflicts = []
        for row in (r for r in sheet.iter() if r.tag.split("}")[-1] == "row"):
            cells = []
            for cell in (c for c in row if c.tag.split("}")[-1] == "c"):
                kind = cell.attrib.get("t")
                value = next((v.text or "" for v in cell.iter() if v.tag.split("}")[-1] == "v"), "")
                if kind == "s":
                    try:
                        value = shared[int(value)]
                    except (ValueError, IndexError):
                        value = ""
                elif kind == "inlineStr":
                    value = content_text(cell)
                value = " ".join(value.replace("\u00a0", " ").split())
                if value:
                    cells.append((cols_number(cell.attrib.get("r", "")), value))
            cells.sort()
            for i, (col, value) in enumerate(cells):
                item = code_text(value)
                if not item:
                    continue
                code, desc = item
                if not valid_label(desc):
                    desc = ""
                    for col2, next_text in cells[i + 1:]:
                        if col2 - col > 5 or code_text(next_text):
                            break
                        if valid_label(next_text):
                            desc = next_text
                            break
                if not valid_label(desc):
                    continue
                if code in results and results[code] != desc:
                    conflicts.append((code, results[code], desc))
                else:
                    results[code] = desc
        if conflicts:
            raise ValueError("Descripciones contradictorias para códigos: " + repr(conflicts[:5]))
        codes = [f"{group}.{n}" for group, count in EXPECTED.items() for n in range(1, count + 1)]
        missing = [c for c in codes if c not in results]
        extra = [c for c in results if c not in codes]
        if missing or extra or len(results) != 153:
            raise ValueError(f"Libro no validado: {len(results)}/153 descripciones; "
                             f"faltantes={missing[:20]}, extras={extra[:20]}. "
                             "No se generan nombres estimados. Revisa la tabla del Excel.")
        return {code: results[code] for code in codes}


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python extraer-causas-desde-excel.py <Excel-original.xlsx>")
    path = Path(sys.argv[1]).expanduser().resolve()
    if not path.is_file():
        raise SystemExit("Archivo no encontrado: " + str(path))
    try:
        descriptions = parse(path)
    except (ValueError, ET.ParseError, KeyError) as exc:
        raise SystemExit(str(exc)) from exc
    data = {
        "archivo": SOURCE_NAME,
        "hoja": "Tabla",
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "estado": "verificado_desde_plantilla_original",
        "entradas": [{"codigo": code, "descripcion": name} for code, name in descriptions.items()],
    }
    # Salida JavaScript estática: no existe carga manual del libro en el formulario.
    OUTPUT.write_text("/* Derivado de " + SOURCE_NAME + "; 153 descripciones verificadas. */\n" +
                      "window.HYS308_CAUSAS_OFICIALES=Object.freeze(" +
                      json.dumps(data, ensure_ascii=True, indent=2) + ");\n", encoding="utf-8")
    print("Catálogo oficial generado: " + str(OUTPUT))
    print("153 opciones con código y descripción, SHA256=" + data["sha256"])


if __name__ == "__main__":
    main()
