const {randomUUID,timingSafeEqual}=require('node:crypto');
const {autor,revisor,ajeno}=require('./fixture-local.cjs');

// Credenciales públicas y ficticias para el servidor de desarrollo en loopback.
const accounts=new Map([
 ['elaborador',{password:'prueba-elaborador',actor:autor,nombre:'Elaborador de prueba',modules:['APR','OTROS'],write:true}],
 ['consulta-apr',{password:'prueba-consulta',actor:revisor,nombre:'Consulta APR de prueba',modules:['APR'],readAll:true,write:false}],
 ['otro-elaborador',{password:'prueba-otro',actor:ajeno,nombre:'Otro elaborador de prueba',modules:['APR'],write:true}]
]);
const duration=30*60*1000;
function denied(message,status){
 return Object.assign(Error(message),{status});
}

function createSessions(now=Date.now){
 const active=new Map();
 function tokenFrom(header){
  return typeof header==='string'?/^Bearer ([a-f0-9-]{36})$/i.exec(header)?.[1]:null;
 }
 return {
  login(input){
   const account=accounts.get(input?.usuario);
   const received=typeof input?.clave==='string'?Buffer.from(input.clave):Buffer.alloc(0);
   const expected=Buffer.from(account?.password??'');
   if(!account||received.length!==expected.length||!timingSafeEqual(received,expected)){
    throw denied('Credenciales ficticias inválidas.',401);
   }
   const time=now();
   for(const [key,entry] of active)if(entry.expires<=time)active.delete(key);
   const token=randomUUID();
   const session={actor:account.actor,nombre:account.nombre,modules:account.modules,write:account.write,readAll:account.readAll===true};
   active.set(token,{...session,expires:time+duration});
   return {token,...session};
  },
  require(header){
   const token=tokenFrom(header);
   const entry=active.get(token);
   if(!entry||entry.expires<=now()){
    if(token)active.delete(token);
    throw denied('Inicia sesión para acceder a los informes de prueba.',401);
   }
   return entry;
  },
  logout(header){active.delete(tokenFrom(header));}
 };
}
module.exports={createSessions};
