const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {validarDestino,verificar}=require('./verificar-supabase-auth.cjs');

test('El ejecutor rechaza destinos remotos y claves privilegiadas',()=>{
 const config={url:'https://ujfsugivgysyhboyirtz.supabase.co/',publicKey:'sb_publishable_prueba'};
 assert.throws(()=>validarDestino(config),/loopback/);
 const local={...config,url:'http://127.0.0.1:54321/'};
 assert.throws(()=>validarDestino({...local,publicKey:'sb_secret_prueba'}),/clave anon/);
 const jwt=claims=>'x.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.x';
 assert.throws(()=>validarDestino({...local,publicKey:jwt({role:'service_role'})}),/clave anon/);
 assert.throws(()=>validarDestino({...local,publicKey:jwt({role:'anon',ref:'ujfsugivgysyhboyirtz'})}),/clave anon/);
});

test('El ejecutor conserva el token durante la revocación y detecta permisos que siguen abiertos',async()=>{
 let revoked=false;
 const id=n=>'v242-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const ids=[id(1),id(2),id(3)];
 const server=createServer(async(req,res)=>{
  const parts=[];
  for await(const chunk of req)parts.push(chunk);
  const body=JSON.parse(Buffer.concat(parts).toString());
  const token=req.headers.authorization;
  let status=200,data;
  if(req.url==='/auth/v1/token?grant_type=password'){
   const author=body.email==='elaborador@prueba.invalid';
   data={access_token:author?'autor':'consulta',user:{id:author?'A':'C'}};
  }else if(req.url.endsWith('hys242_consultar_informes')){
   assert.equal(token,'Bearer consulta');
   data=body.p_modulo==='APR'&&!revoked?[{id:ids[0]}]:[];
  }else{
   const index=ids.indexOf(body.p_id);
   const allowed=token==='Bearer autor'||(token==='Bearer consulta'&&!revoked&&index===0);
   if(allowed){
    data={id:body.p_id,modulo:index===2?'OTROS':'APR',creador_id:'A',
     archivo:body.p_pdf?{pdf:Buffer.from('%PDF-prueba').toString('base64')}:null};
   }else{
    status=token?403:401;
    data={code:'42501'};
   }
  }
  res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify(data));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const config={url:'http://127.0.0.1:'+server.address().port+'/',publicKey:'sb_publishable_prueba',
   projectMarker:'QA-v326',author:{email:'elaborador@prueba.invalid',password:'prueba'},
   viewer:{email:'consulta@prueba.invalid',password:'prueba'},
   reports:{allowedApr:ids[0],otherAreaApr:ids[1],otherModule:ids[2]}};
  assert.deepEqual(await verificar(config),{access:true,revocation:false});
  await assert.rejects(verificar(config,{checkpoint:async()=>{}}),/permiso revocado/);
  assert.deepEqual(await verificar(config,{checkpoint:async()=>{revoked=true;}}),{access:true,revocation:true});
 }finally{await new Promise(resolve=>server.close(resolve));}
});
