"""Inventario reproducible, sintaxis y suites; no accede a servicios remotos."""
import hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(__file__).resolve().parent
APP=ROOT/'v333-review'
inventory=[]
syntax=[]
for p in sorted(APP.rglob("*")):
    if not p.is_file() or {"node_modules","__pycache__"}.intersection(p.parts): continue
    item={'file':str(p.relative_to(APP)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    if p.suffix in ('.js','.html','.css'):
        s=p.read_text()
        item['rpc_names']=sorted(set(re.findall(r"\.rpc\(['\"]([^'\"]+)",s)))
        item['table_names']=sorted(set(re.findall(r"\.from\(['\"]([^'\"]+)",s)))
        item['events']=sorted(set(re.findall(r"addEventListener\(['\"]([^'\"]+)",s)))
        item['declared_functions']=re.findall(r'\bfunction\s+(\w+)\s*\(',s)
        item['external_urls']=sorted(set(re.findall(r'https?://[^\s<>\"\x27)]+',s)))
    if p.suffix=='.js':
        r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
        syntax.append({'file':str(p.relative_to(APP)),'exit':r.returncode,'error':r.stderr})
    inventory.append(item)
(OUT/'inventario.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2))
(OUT/'sintaxis.json').write_text(json.dumps(syntax,ensure_ascii=False,indent=2))
results=[]
historical={'test-flash-final-v306.cjs','test-integridad-investigacion-v311.cjs','test-interfaz-avanzada-v309.cjs'}
for p in sorted(OUT.glob('test-*.cjs')):
    r=subprocess.run(['node',str(p)],cwd=ROOT,capture_output=True,text=True)
    results.append({'test':p.name,'scope':'historical' if p.name in historical else 'v333','exit':r.returncode,'output':r.stdout+r.stderr})
(OUT/'resultados-tests.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps({'files':len(inventory),'syntax_pass':sum(x['exit']==0 for x in syntax),'syntax_total':len(syntax),'suites_pass':sum(x['exit']==0 for x in results),'suites_total':len(results),'failed':[x['test'] for x in results if x['exit']]}))
raise SystemExit(int(any(x['exit'] for x in results+syntax)))
