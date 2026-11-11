(function(root){
 'use strict';
 const types={flash:'Flash-Report',final:'Final-Report'};
 function participantes(value){
  return String(value||'').split(/[\/;\n]+/u).map(name=>name.trim()).filter(Boolean);
 }
 function abreviar(names){
  return names.map(name=>{
   const words=name.split(/\s+/u);
   if(words.length<2)return words[0];
   // Entrada convencional: nombres seguidos por hasta dos apellidos.
   const firstSurname=words.length===2?words[1]:words.at(-2);
   const initial=names.length===1&&words.length>2?' '+Array.from(words.at(-1))[0].toLocaleUpperCase('es'):'';
   return words[0]+' '+firstSurname+initial;
  });
 }
 function filename({fecha,codigo,nombres,kind}){
  const parsed=new Date(String(fecha)+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||!Number.isFinite(parsed.getTime())||
     parsed.toISOString().slice(0,10)!==fecha)throw Error('Guarda una fecha válida del incidente antes de exportar.');
  if(!/^INV-\d+$/.test(codigo||'')||!Object.hasOwn(types,kind))throw Error('El expediente aún no tiene código asignado.');
  const names=participantes(nombres);
  if(!names.length)throw Error('Guarda al menos un involucrado antes de exportar.');
  const abbreviated=abreviar(names).map(name=>name.normalize('NFC')
   .replace(/[\\/:*?"<>|_\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu,' ')
   .replace(/\s+/gu,' ').trim()).filter(Boolean);
  if(!abbreviated.length)throw Error('Ingresa un nombre válido para el involucrado.');
  const prefix=fecha+'_'+codigo+'_',suffix='_'+types[kind]+'.pdf';
  const encoder=new TextEncoder();
  const within=value=>encoder.encode(prefix+value+suffix).length<=200;
  const all=abbreviated.join('-');
  if(within(all))return prefix+all+suffix;
  let shown=[];
  for(const name of abbreviated){
   const next=[...shown,name];
   if(!within(next.join('-')+'-y-'+(abbreviated.length-next.length)+'-más'))break;
   shown=next;
  }
  if(shown.length)return prefix+shown.join('-')+'-y-'+(abbreviated.length-shown.length)+'-más'+suffix;
  const tail=abbreviated.length>1?'-y-'+(abbreviated.length-1)+'-más':'';
  let text='';
  for(const char of abbreviated[0]){
   if(!within(text+char+tail))break;
   text+=char;
  }
  return prefix+text.trimEnd()+tail+suffix;
 }
 function create(jsPDF,{kind,codigo,documento,fields}){
  const pdf=new jsPDF({format:'a4',unit:'mm',compress:true});
  let y;
  function header(){
   pdf.setFont('helvetica','bold');pdf.setFontSize(16);
   pdf.text(types[kind].replace('-',' ')+' · '+codigo,15,17);
   pdf.setFont('helvetica','normal');pdf.setFontSize(9);
   pdf.text('Revisión '+documento.version+' · '+documento.estado+' · Copia de prueba',15,24);
   y=34;
  }
  header();
  for(const [label,value] of fields){
   pdf.setFont('helvetica','normal');pdf.setFontSize(10);
   const lines=pdf.splitTextToSize(value,180);
   let offset=0;
   while(offset<lines.length){
    if(y+12>280){pdf.addPage();header();}
    pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text(label+(offset?' (continuación)':''),15,y);
    y+=5;
    const count=Math.min(lines.length-offset,Math.floor((280-y)/4.5)+1);
    pdf.setFont('helvetica','normal');
    for(const line of lines.slice(offset,offset+count)){pdf.text(line,15,y);y+=4.5;}
    offset+=count;y+=4;
   }
  }
  return pdf.output('blob');
 }
 const api={filename,create};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys332InvestigationPdf=api;
})(typeof window==='object'?window:globalThis);
