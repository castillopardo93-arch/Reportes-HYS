#!/usr/bin/env python3
"""Inventario cronológico de GitHub -> Excel OOXML, sin librerías externas.
Se ejecuta en GitHub Actions en una rama de informes; no cambia la app.
"""
import json
import os
import re
import sys
import time
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

REPO = "castillopardo93-arch/Reportes-HYS"
BASE = "desarrollo/v289-auditoria-integral-consolidacion"
OUT = Path("informes/historial/Historial_Completo_Versiones_Reportes_HYS.xlsx")
API = f"https://api.github.com/repos/{REPO}"
TOKEN = os.environ.get("GITHUB_TOKEN", "")
CL = ZoneInfo("America/Santiago")
UTC = timezone.utc
TZ_LABEL = "América/Santiago (hora de Chile)"
now = datetime.now(UTC)
def api(path):
    url = API + path
    headers = {"Accept":"application/vnd.github+json","User-Agent":"Reportes-HYS-Historial-Auditable","X-GitHub-Api-Version":"2022-11-28"}
    if TOKEN: headers["Authorization"] = "Bearer " + TOKEN
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers=headers),timeout=45) as res:
                return json.load(res)
        except Exception as exc:
            if attempt == 3: raise RuntimeError(f"Error consultando {url}: {exc}") from exc
            time.sleep(2**attempt)
def paged(path):
    out = []
    for page in range(1,40):
        joiner="&" if "?" in path else "?"
        data=api(f"{path}{joiner}per_page=100&page={page}")
        if not isinstance(data,list): raise ValueError(f"Se esperaba una lista en {path}: {str(data)[:150]}")
        out.extend(data)
        if len(data) < 100: break
    else:
        raise RuntimeError(f"Más de 3900 filas sin paginación completa en {path}")
    return out
def parsedate(iso):
    return datetime.fromisoformat(iso.replace("Z","+00:00")).astimezone(UTC)
def inferred_version(message, ref=""):
    first = message.splitlines()[0].strip()
    m = re.search(r"^\s*(?:feat|fix|style|docs|test|chore|refactor|security)\(\s*v(\d{1,3})\s*\)",first,re.I)
    if m:return int(m.group(1))
    m = re.search(r"^\s*v\s*(\d{1,3})\b",first,re.I)
    if m:return int(m.group(1))
    m = re.search(r"(?:crear|preparar|publicar|proteger|guardar|respaldar|conservar|consolidar|registrar|actualizar|corrigir|corregir|auditar|integrar)\s+(?:[^\n:]{0,55}?\s+)?v\s*(\d{1,3})\b",first,re.I)
    if m:return int(m.group(1))
    matches = re.findall(r"\bv\s*(\d{1,3})\b",first,re.I)
    if len(matches)==1:return int(matches[0])
    if len(matches)>1:return int(matches[-1])
    m=re.search(r"(?:^|[/\-_])v(\d{1,3})(?=[\-_]|$)",ref,re.I)
    return int(m.group(1)) if m else None
def kind(title):
    s=title.lower()
    if any(x in s for x in ("auditoría","auditoria","revisión integral","revision integral")):return "Auditoría"
    if any(x in s for x in ("prueba","test(","regresión","regresion","qa ","cobertura")):return "Pruebas"
    if any(x in s for x in ("pdf","imprimir","impresión","impresion")):return "PDF / informes"
    if any(x in s for x in ("seguridad","permiso","jwt","rls","contraseña","contrasena","autenticación","autenticacion")):return "Seguridad / accesos"
    if any(x in s for x in ("supabase","rpc","base de datos","backend","sincroniza")):return "Backend / datos"
    if any(x in s for x in ("riesgo","hallazgo","prevención","prevencion","indicador","pilares")):return "Prevención / indicadores"
    if any(x in s for x in ("copia","respaldo","proteg","archivar","historial")):return "Versionado / respaldo"
    if any(x in s for x in ("diseño","diseno","interfaz","vista","css","tarjeta","móvil","movil","responsive")):return "Interfaz"
    if any(x in s for x in ("corrigir","corregir","reparar","fix(")):return "Corrección"
    if any(x in s for x in ("documentar","manifiesto","evidencia","informe técnico")):return "Documentación"
    return "Funcional / general"
def normalized(entry, branch):
    info = entry["commit"]
    iso = info.get("committer",{}).get("date") or info.get("author",{}).get("date")
    return {
        "sha":entry["sha"],
        "dt":parsedate(iso),
        "title":info["message"].splitlines()[0].strip(),
        "message":info["message"].strip(),
        "who":info.get("author",{}).get("name") or "",
        "branch":branch,
        "source_branches":{branch},
        "url":entry.get("html_url") or f"https://github.com/{REPO}/commit/{entry['sha']}"
    }
print("Consultando inventario completo de ramas...",flush=True)
branches=paged("/branches")
print("Ramas encontradas:",len(branches),flush=True)
base_commits=paged(f"/commits?sha={quote(BASE,safe='')}")
print("Commits de la línea de trabajo más reciente:",len(base_commits),flush=True)
all_commits={}
for entry in base_commits:
    item=normalized(entry,BASE)
    all_commits[item["sha"]]=item
main_commits=paged("/commits?sha=main")
print("Commits de main:",len(main_commits),flush=True)
for entry in main_commits:
    sha=entry["sha"]
    if sha in all_commits:all_commits[sha]["source_branches"].add("main")
    else:all_commits[sha]=normalized(entry,"main")
base_sha=set(all_commits)
extra_reports=[]
for b in branches:
    name=b["name"]
    sha=b["commit"]["sha"]
    if sha in all_commits:
        all_commits[sha]["source_branches"].add(name)
        extra_reports.append((name,0,"rama ya incluida"))
        continue
    comparison=api("/compare/"+quote(BASE,safe="")+"..."+quote(name,safe=""))
    delta=comparison.get("commits",[])
    ahead=comparison.get("ahead_by",0)
    if ahead>len(delta):
        # Comparación paginada en lugar de perder commits por límites de la API.
        delta=[]
        for entry in paged(f"/commits?sha={quote(name,safe='')}"):
            if entry["sha"] in base_sha:break
            delta.append(entry)
        if len(delta)<ahead:
            print(f"ATENCIÓN: {name}: esperados={ahead}, leídos={len(delta)}",flush=True)
    count=0
    for entry in delta:
        key=entry["sha"]
        if key not in all_commits:
            all_commits[key]=normalized(entry,name)
            count+=1
        else:
            all_commits[key]["source_branches"].add(name)
    extra_reports.append((name,count,"rama paralela"))
    print(f"Rama {name}: {count} commits únicos adicionales",flush=True)
# También incluir el commit de cabecera si por alguna razón lo omite la comparación.
head_shas={x["commit"]["sha"] for x in branches}
missing=head_shas-set(all_commits)
if missing: raise RuntimeError(f"No se incluyeron {len(missing)} commits de cabecera: {sorted(missing)[:5]}")
records=sorted(all_commits.values(),key=lambda x:(x["dt"],x["sha"]))
print("TOTAL DE COMMITS ÚNICOS:",len(records),flush=True)
if not records:raise RuntimeError("No se recuperó ningún commit")
all_versions=defaultdict(list)
for item in records:
    v=inferred_version(item["title"],item["branch"])
    item["version"]=v
    item["kind"]=kind(item["title"])
    if v is not None:all_versions[v].append(item)
version_rows=[]
for v,items in sorted(all_versions.items()):
    candidate=[b["name"] for b in branches if re.search(r"(?:^|[/_\-])v"+str(v)+r"(?=[_\-]|$)",b["name"])]
    version_rows.append((v,len(items),items[0],items[-1],"; ".join(candidate)))
# convertir fechas a números reales de Excel
origin=datetime(1899,12,30)
def excel_day(dt):
    loc=dt.astimezone(CL).replace(tzinfo=None)
    return (loc-origin).total_seconds()/86400
def excel_date(dt):
    return int(excel_day(dt))
def excel_time(dt):
    return excel_day(dt)%1
def is_string(s):
    s=str(s)
    return ("'"+s) if s and s[0] in "=+-@" else s
def cell_ref(col,row):
    s=""
    while col:
        col,r=divmod(col-1,26)
        s=chr(65+r)+s
    return s+str(row)
def text_xml(x):
    return escape(is_string(str(x)),{"'":"&apos;","\"":"&quot;"})
def cell(r,c,value,style=0):
    addr=cell_ref(c,r)
    if value is None:return ""
    if isinstance(value,(int,float)) and not isinstance(value,bool):
        return f'<c r="{addr}" s="{style}"><v>{value:.12g}</v></c>'
    return f'<c r="{addr}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{text_xml(value)}</t></is></c>'
def worksheet_xml(title,headers,rows,widths,links=None):
    # rows: lista de listas de tuplas (value,style). Cabecera Excel en fila 4.
    sheetidx=len(sheet_data)+1
    ncol=max(len(headers),len(widths))
    top=[
      [((title),6)],
      [("Reportes HYS · registro de repositorio GitHub · hora local de Chile",7)],
      [("Corte UTC: "+now.strftime("%Y-%m-%d %H:%M:%S")+" · Filtrar desde la fila 4",7)]
    ]
    links=links or {}
    chunks=[]
    for r,items in enumerate(top,1):
        chunks.append(f'<row r="{r}">{cell(r,1,items[0][0],items[0][1])}</row>')
    chunks.append('<row r="4">'+''.join(cell(4,j,h,1) for j,h in enumerate(headers,1))+'</row>')
    hrefs=[];rels=[]
    for rowno,entry in enumerate(rows,5):
        children=[]
        for colno,(value,style) in enumerate(entry,1):
            children.append(cell(rowno,colno,value,style))
            if (rowno,colno) in links:
                target=links[(rowno,colno)]
                rid=f"rId{len(rels)+1}"
                hrefs.append(f'<hyperlink ref="{cell_ref(colno,rowno)}" r:id="{rid}"/>')
                rels.append(f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{escape(target,{"&":"&amp;"})}" TargetMode="External"/>')
        chunks.append(f'<row r="{rowno}">'+''.join(children)+'</row>')
    if not rows:chunks.append('<row r="5"/>')
    colspec=''.join(f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>' for i,w in enumerate(widths,1))
    end=4+len(rows)
    xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    relurl='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    xml=(f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="{xmlns}" xmlns:r="{relurl}">'
         f'<dimension ref="A1:{cell_ref(ncol,max(end,5))}"/>'
         '<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
         '<sheetFormatPr defaultRowHeight="16"/>'
         f'<cols>{colspec}</cols><sheetData>{"".join(chunks)}</sheetData>'
         f'<autoFilter ref="A4:{cell_ref(len(headers),max(end,5))}"/>'
         +('<hyperlinks>'+''.join(hrefs)+'</hyperlinks>' if hrefs else '')
         +'</worksheet>')
    sheet_data.append((title,xml,rels))
    return sheetidx
# Hoja 1 resumen ejecutivo
sheet_data=[]
local_first=records[0]["dt"].astimezone(CL)
local_last=records[-1]["dt"].astimezone(CL)
summary=[
 [("Repositorio",0),(REPO,0)],
 [("Commits únicos registrados",0),(len(records),8)],
 [("Versiones identificadas",0),(len(all_versions),8)],
 [("Ramas registradas",0),(len(branches),8)],
 [("Ramas alternativas con commits únicos",0),(sum(1 for _,n,_ in extra_reports if n>0),8)],
 [("Fecha inicial en hora Chile",0),(local_first.strftime("%d-%m-%Y %H:%M:%S"),0)],
 [("Última modificación en hora Chile",0),(local_last.strftime("%d-%m-%Y %H:%M:%S"),0)],
 [("Zona horaria",0),(TZ_LABEL,0)],
 [("Criterio de orden",0),("Ascendente por fecha/hora del commit (committer); SHA para desempate",0)],
 [("Fuente de datos",0),(f"https://github.com/{REPO}/branches",5)],
 [("Rama referencia",0),(BASE,0)],
 [("Cobertura",0),("Historial de main + línea v289 + commits divergentes de las demás ramas",0)],
 [("Control de duplicados",0),("Cada SHA se registra una sola vez; los commits compartidos no se repiten",0)],
 [("Interpretación de versión",0),("Extraída del mensaje de commit, o rama si no hay versión explícita",0)],
 [("Alcance de modificaciones",0),("Descripción del commit y enlace al diff completo de archivos",0)],
 [("Advertencia",0),("No equivale a certificación de despliegue o aprobación de versiones",0)]
]
summary_links={(10,2):f"https://github.com/{REPO}/branches"}
worksheet_xml("RESUMEN","Indicador|Valor".split("|"),summary,[44,112],summary_links)
# Registro absoluto de cambios.
headers=["Nº","Fecha (Chile)","Hora (Chile)","Fecha y hora Chile","Versión","Tipo de modificación","Descripción registrada en GitHub","Rama de origen/referencia","Commit SHA","Ver detalle del cambio","Fecha UTC","Autor del commit"]
body=[];links={}
for i,x in enumerate(records,1):
    v=f"v{x['version']}" if x["version"] is not None else "Sin versión explícita"
    date=x["dt"];ch=date.astimezone(CL)
    body.append([(i,8),(excel_date(date),2),(excel_time(date),3),(excel_day(date),4),
        (v,0),(x["kind"],0),(x["title"],0),(x["branch"],0),(x["sha"],0),
        ("Ver commit",5),(date.strftime("%Y-%m-%d %H:%M:%S UTC"),0),(x["who"],0)])
    links[(i+4,10)]=x["url"]
worksheet_xml("HISTORIAL CRONOLOGICO",headers,body,[8,16,16,23,15,25,90,54,44,17,24,26],links)
# Versiones detalladas.
versions=[];vlinks={}
for i,(v,n,first,last,refs) in enumerate(version_rows,1):
    versions.append([(f"v{v}",0),(n,8),(excel_day(first["dt"]),4),(excel_day(last["dt"]),4),
     (first["title"],0),(last["title"],0),(refs or "Sin rama exclusiva",0),
     ("Ver último cambio",5)])
    vlinks[(i+4,8)]=last["url"]
worksheet_xml("VERSIONES",["Versión","Nº commits","Primer commit (Chile)","Último commit (Chile)","Primer cambio registrado","Cambio más reciente","Ramas nominales","Enlace"],versions,[16,14,23,23,80,85,66,20],vlinks)
# Ramas de GitHub.
brrows=[];brlinks={}
bysha={x["sha"]:x for x in records}
for i,b in enumerate(sorted(branches,key=lambda v:v["name"]),1):
    key=b["commit"]["sha"]
    commit=bysha[key]
    name=b["name"]
    status="Rama principal" if name=="main" else ("Última consolidación" if name==BASE else ("Rama de informes" if name.startswith("informes/") else "Desarrollo / respaldo"))
    brrows.append([(name,0),(status,0),(excel_day(commit["dt"]),4),(key,0),(commit["title"],0),
      ("Ver rama",5),(next((n for r,n,_ in extra_reports if r==name),0),8)])
    brlinks[(i+4,6)]=f"https://github.com/{REPO}/tree/{quote(name,safe='/')}"
worksheet_xml("RAMAS",["Nombre de rama","Clasificación","Fecha del commit cabeza (Chile)","SHA cabeza","Última modificación","Enlace","Commits exclusivos vs línea base"],brrows,[64,26,26,44,85,20,21],brlinks)
# Actividad diaria sin sumar commits duplicados.
counts=Counter(x["dt"].astimezone(CL).strftime("%Y-%m-%d") for x in records)
dayrows=[]
for date,qty in sorted(counts.items()):
    dayrows.append([(date,0),(qty,8)])
worksheet_xml("ACTIVIDAD DIARIA",["Fecha en Chile","Commits únicos"],dayrows,[21,19])
# Hoja de alcance, metodología y limitaciones.
notes=[
 ("Fuente","GitHub REST API: lista paginada de ramas y commits, comparación de divergencias contra v289."),
 ("Cobertura","Se recuperan todos los commits de la rama v289, todos los de main y los commits adicionales que están en ramas alternativas."),
 ("Deduplicación","Los commits con el mismo SHA se cuentan una sola vez aunque aparezcan en varias ramas."),
 ("Cronología","Se usa la fecha/hora del committer del commit y se convierte a America/Santiago para ordenar."),
 ("Fechas","El momento de un commit es su marca de tiempo registrada en GitHub; no mide el tiempo real de trabajo ni la fecha de aprobación."),
 ("Versiones","Número inferido del mensaje del commit y, si no consta, de la rama. No se inventan cambios para números ausentes."),
 ("Ramas","Fecha de rama corresponde al commit de cabecera; GitHub no entrega la fecha de creación de cada rama en esta consulta."),
 ("Modificaciones","La descripción literal del primer renglón del commit más el enlace directo permite inspeccionar archivos y diff."),
 ("Integridad","La consulta confirma que los SHA de cabecera de las ramas están incluidos en el historial."),
 ("Corte","Generación instantánea; commits posteriores no aparecen hasta regenerar el Excel."),
 ("Sin publicación","La extracción y generación del Excel no modifica main, Supabase, versiones aprobadas ni datos de la app."),
 ("Uso","Filtros desplegables en la fila 4 de HISTORIAL CRONOLOGICO, VERSIONES y RAMAS; congelación de encabezados."),
 ("Orden","HISTORIAL CRONOLOGICO ordenado del registro más antiguo al más reciente, con día y hora local."),
 ("Qué NO prueba","Un commit de código no significa que una función esté habilitada, desplegada o validada en producción."),
]
worksheet_xml("METODOLOGIA",["Aspecto","Descripción y limitaciones"],[[(k,1),(v,0)] for k,v in notes],[28,118])
# Crear OOXML
styles='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FF123C58"/><sz val="17"/><name val="Aptos Display"/></font><font><u/><color rgb="FF0A64AB"/><sz val="10"/><name val="Aptos"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123C58"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF3FA"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
 <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
 <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf>
 <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
 <xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
 <xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
 <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
 <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
 <xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>
 <xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="hh:mm:ss"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy hh:mm:ss"/></numFmts>
</styleSheet>'''
rels_tpl='http://schemas.openxmlformats.org/package/2006/relationships'
main_ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
with zipfile.ZipFile(OUT,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=8) as z:
    z.writestr("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheet_data)+1))+'</Types>')
    z.writestr("_rels/.rels",f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{rels_tpl}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    z.writestr("xl/styles.xml",styles)
    z.writestr("xl/workbook.xml",f'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="{main_ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>'+''.join(f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i,(name,_,_) in enumerate(sheet_data,1))+'</sheets></workbook>')
    z.writestr("xl/_rels/workbook.xml.rels",f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{rels_tpl}">'+''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheet_data)+1))+f'<Relationship Id="rId{len(sheet_data)+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    for i,(name,xml,rels) in enumerate(sheet_data,1):
        z.writestr(f"xl/worksheets/sheet{i}.xml",xml)
        if rels:
            z.writestr(f"xl/worksheets/_rels/sheet{i}.xml.rels",f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{rels_tpl}">{"".join(rels)}</Relationships>')
# Revisión estructural en Python: ZIP íntegro y XML bien formados.
from xml.etree import ElementTree as ET
with zipfile.ZipFile(OUT) as z:
    assert z.testzip() is None
    for name in z.namelist():
        if name.endswith(".xml") or name.endswith(".rels"): ET.fromstring(z.read(name))
assert len(records)>=798,"Historial incompleto en la línea base"
print("ARCHIVO GENERADO:",OUT,flush=True)
print("TOTAL COMMITS:",len(records),"VERSIONES:",len(version_rows),"RAMAS:",len(branches),"DÍAS:",len(counts),"TAMAÑO:",OUT.stat().st_size,flush=True)
print("RANGO:",local_first.isoformat(),"→",local_last.isoformat(),flush=True)
