// Combined RN/CA admission rotation and 3C CA assignment patch
(function(){
  const RN_DAY=['0700-1500','1500-1900'];
  const RN_NIGHT=['1900-0700'];
  const CA_SHIFTS=[
    {key:'0630-1430',label:'Day 0630–1430'},
    {key:'1430-1830',label:'Eve 1 1430–1830'},
    {key:'1830-2230',label:'Eve 2 1830–2230'},
    {key:'2230-0630',label:'Night 2230–0630'}
  ];
  const LS_CA_ROT='_ccCaAdmissionOrderV1';

  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function uniq(arr){const seen=new Set();return (arr||[]).map(x=>x&&x.name?x.name:x).filter(Boolean).filter(n=>!seen.has(n)&&seen.add(n));}
  function yesterday(d){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()-1);return x.toISOString().slice(0,10);}
  function isAgency(name){return !!(((state||{}).agencyDates||{})[name]||{}).isAgency;}
  function isOrientee(name){return !!(((state||{}).empOrientation||{})[name]);}
  function pRows(dateKey,keys){const p=((state||{}).placements||{})[dateKey]||{};return keys.flatMap(k=>p[k]||[]);}

  function rn3C(dateKey,shiftName,name){
    const keys=shiftName==='DAY'?RN_DAY:RN_NIGHT;
    return keys.some(sk=>{
      const key=dateKey+'|'+sk;
      if((((state||{}).charge3C||{})[key])===name)return true;
      const triad=(((state||{}).staff3C||{})[key])||{};
      return Object.keys(triad).some(k=>triad[k]===name);
    });
  }
  function eligibleRN(dateKey,shiftName){
    const keys=shiftName==='DAY'?RN_DAY:RN_NIGHT;
    return uniq(pRows(dateKey,keys).filter(x=>x&&x.role==='RN')).filter(n=>!rn3C(dateKey,shiftName,n));
  }
  function rnHist(shiftName){
    const h=((state||{}).admissionOrder)||{},out={};
    Object.keys(h).sort().forEach(d=>{const a=h[d]&&h[d][shiftName];const n=Array.isArray(a)?a[0]:'';if(!n)return;if(!out[n])out[n]={count:0,last:''};out[n].count++;if(d>out[n].last)out[n].last=d;});
    return out;
  }
  function rnCharge(dateKey,shiftName,name){const keys=shiftName==='DAY'?RN_DAY:RN_NIGHT;return keys.some(sk=>(((state||{}).chargeNurses||{})[dateKey+'|'+sk]===name));}
  function rotate(names,dateKey,hist,prevFirst,chargeFn){
    return [...names].sort((a,b)=>{
      if(names.length>1){const ap=a===prevFirst?1:0,bp=b===prevFirst?1:0;if(ap!==bp)return ap-bp;}
      if(chargeFn){const ac=chargeFn(a)?1:0,bc=chargeFn(b)?1:0;if(ac!==bc)return ac-bc;}
      const ah=hist[a]||{count:0,last:''},bh=hist[b]||{count:0,last:''};
      if(ah.count!==bh.count)return ah.count-bh.count;
      if(ah.last!==bh.last)return (ah.last||'').localeCompare(bh.last||'');
      return a.localeCompare(b);
    });
  }
  function buildRN(dateKey,shiftName){
    state.admissionOrder=state.admissionOrder||{};state.admissionOrder[dateKey]=state.admissionOrder[dateKey]||{};
    const all=eligibleRN(dateKey,shiftName),saved=state.admissionOrder[dateKey][shiftName];
    if(Array.isArray(saved)&&saved.length===all.length&&saved.every(n=>all.includes(n))&&all.every(n=>saved.includes(n)))return saved;
    const hist=rnHist(shiftName),prev=((((state.admissionOrder||{})[yesterday(dateKey)]||{})[shiftName])||[])[0]||'';
    const ag=all.filter(isAgency),staff=all.filter(n=>!isAgency(n));
    let out=[];
    if(ag.length){const indep=ag.filter(n=>!isOrientee(n));const lead=rotate(indep.length?indep:ag,dateKey,hist,prev,n=>rnCharge(dateKey,shiftName,n))[0];if(lead)out.push(lead);out.push(...rotate(ag.filter(n=>n!==lead),dateKey,hist,'',n=>rnCharge(dateKey,shiftName,n)));}
    out.push(...rotate(staff.filter(n=>!isOrientee(n)),dateKey,hist,ag.length?'':prev,n=>rnCharge(dateKey,shiftName,n)));
    out.push(...rotate(staff.filter(isOrientee),dateKey,hist,'',n=>rnCharge(dateKey,shiftName,n)));
    out=uniq(out);all.forEach(n=>{if(!out.includes(n))out.push(n);});
    state.admissionOrder[dateKey][shiftName]=out;
    state.firstAdmission=state.firstAdmission||{};state.firstAdmission[dateKey]=state.firstAdmission[dateKey]||{};state.firstAdmission[dateKey][shiftName]=out[0]||'';
    try{if(typeof persistSave==='function')persistSave();}catch(e){}
    return out;
  }

  function caStore(){try{return JSON.parse(localStorage.getItem(LS_CA_ROT)||'{}');}catch(e){return {};}}
  function saveCaStore(v){try{localStorage.setItem(LS_CA_ROT,JSON.stringify(v));}catch(e){}}
  function ca3C(dateKey,shiftKey,name){const triad=(((state||{}).staff3C||{})[dateKey+'|'+shiftKey])||{};return triad.ca===name;}
  function eligibleCA(dateKey,shiftKey){return uniq(pRows(dateKey,[shiftKey]).filter(x=>x&&x.role==='CA')).filter(n=>!ca3C(dateKey,shiftKey,n));}
  function caHist(shiftKey,store){const out={};Object.keys(store).sort().forEach(d=>{const a=store[d]&&store[d][shiftKey];const n=Array.isArray(a)?a[0]:'';if(!n)return;if(!out[n])out[n]={count:0,last:''};out[n].count++;if(d>out[n].last)out[n].last=d;});return out;}
  function buildCA(dateKey,shiftKey){
    const store=caStore();store[dateKey]=store[dateKey]||{};
    const all=eligibleCA(dateKey,shiftKey),saved=store[dateKey][shiftKey];
    if(Array.isArray(saved)&&saved.length===all.length&&saved.every(n=>all.includes(n))&&all.every(n=>saved.includes(n)))return saved;
    const hist=caHist(shiftKey,store),prev=((((store[yesterday(dateKey)]||{})[shiftKey])||[])[0])||'';
    const ag=all.filter(isAgency),staff=all.filter(n=>!isAgency(n));let out=[];
    if(ag.length){const indep=ag.filter(n=>!isOrientee(n));const lead=rotate(indep.length?indep:ag,dateKey,hist,prev)[0];if(lead)out.push(lead);out.push(...rotate(ag.filter(n=>n!==lead),dateKey,hist,''));}
    out.push(...rotate(staff.filter(n=>!isOrientee(n)),dateKey,hist,ag.length?'':prev));
    out.push(...rotate(staff.filter(isOrientee),dateKey,hist,''));
    out=uniq(out);all.forEach(n=>{if(!out.includes(n))out.push(n);});store[dateKey][shiftKey]=out;saveCaStore(store);return out;
  }

  function listCell(order,emptyText){
    if(!order.length)return '<div style="padding:4px;color:#6b7280;font-style:italic;font-size:8.5pt;">'+emptyText+'</div>';
    return order.map((name,i)=>{const badge=isAgency(name)?' <span style="font-size:6.5pt;font-weight:800;color:#7c2d12;background:#ffedd5;border:1px solid #fdba74;padding:0 3px;border-radius:2px;">AGENCY</span>':'';const suffix=i===0?'st':i===1?'nd':i===2?'rd':'th';return '<div style="padding:2px 4px;border-bottom:1px solid #dbe5ef;font-size:8.5pt;line-height:1.1;'+(i===0?'font-weight:800;color:#0f4c81;background:#e0f2fe;':'')+'"><b style="display:inline-block;width:24px;">'+(i+1)+suffix+'</b>'+esc(name)+badge+'</div>';}).join('');
  }
  function rnBlock(dateKey){const day=buildRN(dateKey,'DAY'),night=buildRN(dateKey,'NIGHT');return '<div class="first-admission-print" style="margin:7px 0 0;padding:6px 8px;border:1.5px solid #0f4c81;border-radius:4px;background:#f8fbff;page-break-inside:avoid;"><div style="font-size:10pt;font-weight:800;text-transform:uppercase;color:#0f4c81;margin-bottom:4px;">RN Admission Order</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr><th style="width:50%;border:1px solid #9fbad0;padding:3px;background:#eef6ff;font-size:9pt;">☀ Day Shift</th><th style="width:50%;border:1px solid #9fbad0;padding:3px;background:#eef6ff;font-size:9pt;">🌙 Night Shift</th></tr><tr><td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">'+listCell(day,'No eligible 3B RN assigned')+'</td><td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">'+listCell(night,'No eligible 3B RN assigned')+'</td></tr></table></div>';}
  function caBlock(dateKey){const cells=CA_SHIFTS.map(s=>buildCA(dateKey,s.key));return '<div class="ca-admission-print" style="margin:6px 0 0;padding:6px 8px;border:1.5px solid #0e7490;border-radius:4px;background:#f5fcfd;page-break-inside:avoid;"><div style="font-size:10pt;font-weight:800;text-transform:uppercase;color:#0e7490;margin-bottom:4px;">CA Admission Order</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>'+CA_SHIFTS.map(s=>'<th style="border:1px solid #8cc7d1;padding:3px 2px;background:#ecfeff;font-size:8pt;">'+s.label+'</th>').join('')+'</tr><tr>'+cells.map(a=>'<td style="border:1px solid #8cc7d1;vertical-align:top;padding:0;">'+listCell(a,'No eligible CA')+'</td>').join('')+'</tr></table></div>';}
  function compactCss(){return '<style id="cc-one-page-print-fix">@page{size:letter portrait!important;margin:.22in .28in!important}@media print{html,body{margin:0!important;padding:0!important}.ps-page{padding:0!important;margin:0 auto!important;max-width:none!important;width:100%!important;min-height:0!important;height:auto!important}.ps-title{font-size:18pt!important;margin:0 0 2px!important;line-height:1.05!important}.ps-date{font-size:10pt!important;margin:0 0 6px!important;line-height:1.05!important}.ps-section-label{font-size:10pt!important;margin:5px 0 2px!important;padding-bottom:2px!important}.ps-table{margin-bottom:2px!important}.ps-table th{font-size:9pt!important;padding:3px 4px!important}.ps-table td{font-size:9.3pt!important;padding:3px 4px!important}.ps-footer{font-size:7.5pt!important;margin-top:5px!important;padding-top:3px!important}.first-admission-print,.ca-admission-print{margin-top:6px!important}}</style>';}
  function fitScript(){return '<script id="cc-fit-one-page">(function(){function fit(){try{var p=document.querySelector(".ps-page")||document.body;document.body.style.zoom="1";var h=p.getBoundingClientRect().height,max=(11-.50)*96;if(h>max)document.body.style.zoom=String(Math.max(.78,Math.min(1,max/h)));}catch(e){}}window.addEventListener("load",function(){fit();setTimeout(function(){fit();window.print();},120);});})();<\\/script>';}
  function placeBottom(html,inject){if(/<div class=["']ps-footer["']/.test(html))return {html:html.replace(/(<div class=["']ps-footer["'][^>]*>)/,inject+'$1'),done:true};if(/<\\/body>/i.test(html))return {html:html.replace(/<\\/body>/i,inject+'</body>'),done:true};return {html:html,done:false};}
  function wrap(fnName){const original=window[fnName];if(typeof original!=='function'||original.__ccRotV2)return;const wrapped=function(){const dateKey=((state||{}).activeBoardDate)||'';const inject=dateKey?rnBlock(dateKey)+caBlock(dateKey):'';const realOpen=window.open;window.open=function(){const child=realOpen.apply(window,arguments);if(!child||!inject)return child;try{const realWrite=child.document.write.bind(child.document);let done=false;child.document.write=function(html){if(typeof html==='string'){if(!done&&!html.includes('ca-admission-print')){const r=placeBottom(html,inject);html=r.html;done=r.done;}if(fnName==='printNursingServices'){html=html.replace('</head>',compactCss()+'</head>');html=html.replace(/<script>window\\.onload=function\\(\\)\\{window\\.print\\(\\);\\}<\\\\\\/script>/,fitScript());}}return realWrite(html);};}catch(e){}return child;};let result;try{result=original.apply(this,arguments);}finally{if(!(result&&typeof result.then==='function'))window.open=realOpen;}if(result&&typeof result.then==='function')return result.finally(()=>{window.open=realOpen;});return result;};wrapped.__ccRotV2=true;window[fnName]=wrapped;try{eval(fnName+' = window[fnName]');}catch(e){}};

  function scheduledCAs(dateKey,shiftKey){return uniq(pRows(dateKey,[shiftKey]).filter(x=>x&&x.role==='CA'));}
  function save3CCA(shiftKey,name){if(typeof state==='undefined')return;const d=state.activeChargeDate||state.activeBoardDate;if(!d)return;state.staff3C=state.staff3C||{};const key=d+'|'+shiftKey;state.staff3C[key]=state.staff3C[key]||{};if(name)state.staff3C[key].ca=name;else delete state.staff3C[key].ca;try{if(typeof persistSave==='function')persistSave();}catch(e){}render3CCA();}
  window.save3CCA=save3CCA;
  function render3CCA(){const host=document.getElementById('charge-assignments');if(!host||typeof state==='undefined')return;let card=document.getElementById('cc-ca-3c-assign');if(!card){card=document.createElement('div');card.id='cc-ca-3c-assign';card.className='card';card.style.marginTop='12px';host.parentNode.insertBefore(card,host.nextSibling);}const d=state.activeChargeDate||state.activeBoardDate||'';card.innerHTML='<div class="card-header"><div><div class="card-title">🩺 3C Clinical Assistant Assignment</div><div style="font-size:11px;color:var(--text2);margin-top:2px;">Assign the CA covering 3C for each CA shift. Assigned 3C CAs are removed from the CA admission rotation.</div></div></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">'+CA_SHIFTS.map(s=>{const key=d+'|'+s.key,val=((((state.staff3C||{})[key])||{}).ca)||'';const opts=scheduledCAs(d,s.key);if(val&&!opts.includes(val))opts.push(val);return '<div><div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:4px;">'+s.label+'</div><select onchange="save3CCA(\''+s.key+'\',this.value)" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:5px;color:var(--white);padding:7px;font-size:11px;"><option value="">— Not assigned —</option>'+opts.map(n=>'<option value="'+esc(n)+'" '+(n===val?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></div>';}).join('')+'</div>';}
  function hookCharge(){const orig=window.renderChargeAssignments;if(typeof orig==='function'&&!orig.__ccCA3C){window.renderChargeAssignments=function(){const r=orig.apply(this,arguments);setTimeout(render3CCA,0);return r;};window.renderChargeAssignments.__ccCA3C=true;try{eval('renderChargeAssignments = window.renderChargeAssignments');}catch(e){}}render3CCA();}
  function install(){if(typeof state==='undefined')return;wrap('printNursingServices');wrap('printStaffingSheet');hookCharge();render3CCA();}
  if(document.readyState==='loading')window.addEventListener('load',()=>{let n=0,t=setInterval(()=>{install();if(++n>40)clearInterval(t);},250);});else{let n=0,t=setInterval(()=>{install();if(++n>40)clearInterval(t);},250);}
})();