const {validatePack,validateReportStart}=require('../integrity-v255.js');
const {validatePhoto,validPdfFilename}=require('../archive-policy-v293.js');

function invalid(message,status=400){
 return Object.assign(Error(message),{status});
}

const operationPattern=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const reportIdPattern=/^v242-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function resumen(row){
 const {id,revision,cerrado,nombre_pdf,fecha,desde,hasta,responsable,turno,proyecto,area}=row;
 return {id,reportId:id,revision,revision_estado:'Cerrado',filename:nombre_pdf,hasPdf:true,
  date:fecha,dateFrom:desde,dateTo:hasta,owner:responsable,shift:turno,project:proyecto,area,
  createdAt:cerrado,period:desde+' al '+hasta,
  history:[{at:cerrado,action:'Informe finalizado en la base local',changes:[]}]};
}
const resumenSql=`id,revision,cerrado,nombre_pdf,payload->>'date' as fecha,
 payload->>'dateFrom' as desde,payload->>'dateTo' as hasta,payload->>'owner' as responsable,
 payload->>'shift' as turno,payload->>'project' as proyecto,payload->>'area' as area`;

async function borrador(db,input,session){
 const {actor,modules,write,readAll}=session;
 const {module}=input??{};
 if(!['APR','OTROS'].includes(module))throw invalid('Tarjeta de informe inválida.');
 if(!modules.includes(module))throw invalid('La cuenta no tiene acceso a esta tarjeta.',403);
 const closedRead=['listarCerrados','leerCerrado'].includes(input?.action);
 if(!closedRead&&!write)throw invalid('La cuenta solo puede consultar informes cerrados.',403);
 if(input?.action==='confirmarCierre'){
  const {id,operacion}=input;
  if(typeof id!=='string'||!reportIdPattern.test(id)||
     typeof operacion!=='string'||!operationPattern.test(operacion))throw invalid('Acuse de cierre inválido.');
  const {rows}=await db.query(`select id,revision from hys318_lab.borradores
   where actor=$1 and id=$2 and payload->>'module'=$3 and operacion_cierre=$4`,
   [actor,id,module,operacion]);
  return rows[0]??null;
 }
 if(input?.action==='listarCerrados'){
  const limit=20;
  const cursor=input.cursor??null;
  if(cursor!==null&&(typeof cursor.id!=='string'||!reportIdPattern.test(cursor.id)||
     typeof cursor.at!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?\+00$/.test(cursor.at)||
     !Number.isFinite(Date.parse(cursor.at))))throw invalid('Punto de paginación inválido.');
  const {rows}=await db.query(`select ${resumenSql}, to_char(cerrado at time zone 'UTC','YYYY-MM-DD HH24:MI:SS.US')||'+00' as cursor_fecha from hys318_lab.borradores
   where (actor=$1 or $3::boolean) and payload->>'module'=$2 and cerrado is not null
    and ($4::timestamptz is null or cerrado<$4 or (cerrado=$4 and id>$5))
   order by cerrado desc,id limit $6`,[actor,module,readAll,cursor?.at??null,cursor?.id??null,limit+1]);
  const items=rows.slice(0,limit);
  const last=items.at(-1);
  return {items:items.map(resumen),next:rows.length>limit?{at:last.cursor_fecha,id:last.id}:null};
 }
 if(input?.action==='leerCerrado'){
  if(typeof input.id!=='string'||!reportIdPattern.test(input.id))throw invalid('Informe inválido.');
  const {rows}=await db.query(`select ${resumenSql},payload,
   case when $3 then encode(pdf,'base64') else null end as pdf from hys318_lab.borradores
   where (actor=$1 or $5::boolean) and id=$2 and payload->>'module'=$4 and cerrado is not null`,[actor,input.id,input.pdf===true,module,readAll]);
  const row=rows[0];
  return row?{...resumen(row),reportData:row.payload,pdf:row.pdf}:null;
 }
 if(input?.action==='recuperar'){
  const {rows}=await db.query(`select id, revision, payload from hys318_lab.borradores
    where actor=$1 and payload->>'module'=$2 and cerrado is null order by actualizado desc,id limit 1`,[actor,module]);
  return rows[0]??null;
 }
 if(!['guardar','finalizar'].includes(input?.action))throw invalid('Operación de borrador inválida.');
 const {payload,revision}=input;
 if(!Number.isInteger(revision)||revision<0||revision>=2147483647||
    payload?.module!==module||payload.status!=='En edición'||
    !reportIdPattern.test(payload.reportId)||payload.authenticatedUser!==actor){
  throw invalid('Se requiere un borrador de la tarjeta seleccionada y de la cuenta ficticia.');
 }
 try{validatePack(payload,module,{validatePhoto});}catch(error){throw invalid(error.message);}
 const values=[actor,payload.reportId,JSON.stringify(payload)];
 if(input.action==='finalizar'){
  const {operacion}=input;
  if(typeof operacion!=='string'||!operationPattern.test(operacion))throw invalid('Identificador de cierre inválido.');
  if(revision===0)throw invalid('Guarda el borrador en la base antes de finalizar.');
  const problema=validateReportStart(payload);
  if(problema)throw invalid(problema.message);
  const {pdf,filename}=input;
  if(typeof pdf!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(pdf)||pdf.length%4!==0||
     !validPdfFilename(filename)){
   throw invalid('PDF inválido.');
  }
  const bytes=Buffer.from(pdf,'base64');
  if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||!bytes.subarray(-32).toString().trimEnd().endsWith('%%EOF')){
   throw invalid('El archivo no tiene un encabezado y cierre PDF válidos.');
  }
  const {rows}=await db.query(`update hys318_lab.borradores
   set payload=$3, revision=revision+1, actualizado=clock_timestamp(), cerrado=clock_timestamp(),
       pdf=decode($5,'base64'), nombre_pdf=$6, operacion_cierre=$8
   where actor=$1 and id=$2 and revision=$4 and payload->>'module'=$7 and cerrado is null returning id,revision`,
   [actor,payload.reportId,JSON.stringify({...payload,status:'Finalizado'}),revision,pdf,filename,module,operacion]);
  if(!rows.length)throw invalid('El informe cambió o ya fue finalizado. Revisa Reportes anteriores.',409);
  return rows[0];
 }
 const result=revision===0
  ?await db.query(`insert into hys318_lab.borradores (actor,id,payload,revision)
      values ($1,$2,$3,1) on conflict do nothing returning id,revision`,values)
  :await db.query(`update hys318_lab.borradores set payload=$3, revision=revision+1,
      actualizado=clock_timestamp() where actor=$1 and id=$2 and revision=$4 and payload->>'module'=$5 and cerrado is null
      returning id,revision`,[...values,revision,module]);
 if(!result.rows.length)throw invalid('Existe otra revisión guardada. Tus datos permanecen en pantalla.',409);
 return result.rows[0];
}
module.exports={borrador};
