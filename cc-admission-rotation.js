// RN/CA admission rotation + 3C CA assignment
(function(){
  const RN_DAY=['0700-1500','1500-1900'];
  const RN_NIGHT=['1900-0700'];
  const CA_SHIFTS=[
    {key:'0630-1430',label:'Day 0630–1430',fsm:'Day'},
    {key:'1430-1830',label:'Eve 1 1430–1830',fsm:'Eve'},
    {key:'1830-2230',label:'Eve 2 1830–2230',fsm:'Eve'},
    {key:'2230-0630',label:'Night 2230–0630',fsm:'Night'}
  ];
  const CA_ROT='_ccCaAdmissionOrderV1';
  const FSM_LOG='float_sitter_log_3b';

  function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
  function uniq(rows){const s=new Set();return (rows||[]).map(x=>x&&x.name?x.name:x).filter(Boolean).filter(n=>!s.has(n)&&s.add(n));}
  function prevDate(d){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()-1);return x.toISOString().slice(0,10);}
  function rows(dateKey,keys){const p=(state.placements||{})[dateKey]||{};return keys.flatMap(k=>p[k]||[]);}
  function isAgency(n){return !!(((state.agencyDates||{})[n]||{}).isAgency);}
  function isOrientee(n){return !!((state.empOrientation||{})[n]);}

  function fsmHistory(){try{const v=JSON.parse(localStorage.getItem(FSM_LOG)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
  function unavailable(dateKey,fsmShift,name){return fsmHistory().some(e=>e&&e.date===dateKey&&e.staff===name&&e.shift===fsmShift&&(e.assign==='Float'||e.assign==='Sitter'));}

  function sortRot(names,hist,prevFirst,chargeCheck,avoidSet){
    avoidSet=avoidSet||new Set();
    return [...names].sort((a,b)=>{
      if(names.length>1){const aa=avoidSet.has(a)?1:0,ba=avoidSet.has(b)?1:0;if(aa!==ba)return aa-ba;}
      if(names.length>1){const ap=a===prevFirst?1:0,bp=b===prevFirst?1:0;if(ap!==bp)return ap-bp;}
      if(chargeCheck){const ac=chargeCheck(a)?1:0,bc=chargeCheck(b)?1:0;if(ac!==bc)return ac-bc;}
      const ah=hist[a]||{count:0,last:''},bh=hist[b]||{count:0,last:''};
      if(ah.count!==bh.count)return ah.count-bh.count;
      if(ah.last!==bh.last)return (ah.last||'').localeCompare(bh.last||'');
      return a.localeCompare(b);
    });
  }

  function rnKeys(shift){return shift==='DAY'?RN_DAY:RN_NIGHT;}
  function rn3C(dateKey,shift,name){return rnKeys(shift).some(sk=>{const k=dateKey+'|'+sk;if((state.charge3C||{})[k]===name)return true;const a=(state.staff3C||{})[k]||{};return Object.keys(a).some(r=>a[r]===name);});}
  function eligibleRN(dateKey,shift){const fsm=shift==='DAY'?'Day':'Night';return uniq(rows(dateKey,rnKeys(shift)).filter(x=>x&&x.role==='RN')).filter(n=>!rn3C(dateKey,shift,n)&&!unavailable(dateKey,fsm,n));}
  function rnHist(shift){const out={},saved=state.admissionOrder||{};Object.keys(saved).sort().forEach(d=>{const a=saved[d]&&saved[d][shift],n=Array.isArray(a)?a[0]:'';if(!n)return;if(!out[n])out[n]={count:0,last:''};out[n].count++;if(d>out[n].last)out[n].last=d;});return out;}
  function rnCharge(dateKey,shift,name){return rnKeys(shift).some(sk=>(state.chargeNurses||{})[dateKey+'|'+sk]===name);}
  function buildRN(dateKey,shift){
    state.admissionOrder=state.admissionOrder||{};state.admissionOrder[dateKey]=state.admissionOrder[dateKey]||{};
    const all=eligibleRN(dateKey,shift),saved=state.admissionOrder[dateKey][shift];
    if(Array.isArray(saved)&&saved.length===all.length&&saved.every(n=>all.includes(n))&&all.every(n=>saved.includes(n)))return saved;
    const hist=rnHist(shift),prior=((state.admissionOrder[prevDate(dateKey)]||{})[shift])||[],prev=prior[0]||'';
    const ag=all.filter(isAgency),reg=all.filter(n=>!isAgency(n)),charge=n=>rnCharge(dateKey,shift,n);let out=[];
    if(ag.length){const indep=ag.filter(n=>!isOrientee(n)),pool=indep.length?indep:ag,lead=sortRot(pool,hist,prev,charge)[0];if(lead)out.push(lead);out.push(...sortRot(ag.filter(n=>n!==lead&&!isOrientee(n)),hist,'',charge));out.push(...sortRot(ag.filter(n=>n!==lead&&isOrientee(n)),hist,'',charge));}
    out.push(...sortRot(reg.filter(n=>!isOrientee(n)),hist,ag.length?'':prev,charge));out.push(...sortRot(reg.filter(isOrientee),hist,'',charge));
    out=uniq(out);all.forEach(n=>{if(!out.includes(n))out.push(n);});state.admissionOrder[dateKey][shift]=out;
    state.firstAdmission=state.firstAdmission||{};state.firstAdmission[dateKey]=state.firstAdmission[dateKey]||{};state.firstAdmission[dateKey][shift]=out[0]||'';
    try{if(typeof persistSave==='function')persistSave();}catch(e){}
    return out;
  }

  function loadCA(){try{return JSON.parse(localStorage.getItem(CA_ROT)||'{}');}catch(e){return {};}}
  function saveCA(v){try{localStorage.setItem(CA_ROT,JSON.stringify(v));}catch(e){}}
  function ca3C(dateKey,shiftKey,name){return (((state.staff3C||{})[dateKey+'|'+shiftKey]||{}).ca)===name;}
  function caShiftMeta(key){return CA_SHIFTS.find(s=>s.key===key)||{fsm:''};}
  function eligibleCA(dateKey,shiftKey){const fsm=caShiftMeta(shiftKey).fsm;return uniq(rows(dateKey,[shiftKey]).filter(x=>x&&x.role==='CA')).filter(n=>!ca3C(dateKey,shiftKey,n)&&!unavailable(dateKey,fsm,n));}
  function caHist(shiftKey,store){const out={};Object.keys(store).sort().forEach(d=>{const a=store[d]&&store[d][shiftKey],n=Array.isArray(a)?a[0]:'';if(!n)return;if(!out[n])out[n]={count:0,last:''};out[n].count++;if(d>out[n].last)out[n].last=d;});return out;}
  function caEarlierFirsts(dateKey,shiftKey,store){
    const idx=CA_SHIFTS.findIndex(s=>s.key===shiftKey),used=new Set();
    if(idx<0)return used;
    for(let i=0;i<idx;i++){
      const a=store[dateKey]&&store[dateKey][CA_SHIFTS[i].key];
      if(Array.isArray(a)&&a[0])used.add(a[0]);
    }
    return used;
  }
  function buildCA(dateKey,shiftKey){
    const store=loadCA();store[dateKey]=store[dateKey]||{};
    const all=eligibleCA(dateKey,shiftKey),saved=store[dateKey][shiftKey],usedToday=caEarlierFirsts(dateKey,shiftKey,store);
    const savedValid=Array.isArray(saved)&&saved.length===all.length&&saved.every(n=>all.includes(n))&&all.every(n=>saved.includes(n));
    if(savedValid&&(!saved[0]||!usedToday.has(saved[0])||all.every(n=>usedToday.has(n))))return saved;
    const hist=caHist(shiftKey,store),prior=((store[prevDate(dateKey)]||{})[shiftKey])||[],prev=prior[0]||'';
    const ag=all.filter(isAgency),reg=all.filter(n=>!isAgency(n));let out=[];
    if(ag.length){
      const indep=ag.filter(n=>!isOrientee(n)),pool=indep.length?indep:ag;
      let lead=sortRot(pool,hist,prev,null,usedToday)[0];
      if(lead)out.push(lead);
      out.push(...sortRot(ag.filter(n=>n!==lead&&!isOrientee(n)),hist,'',null,usedToday));
      out.push(...sortRot(ag.filter(n=>n!==lead&&isOrientee(n)),hist,'',null,usedToday));
    }
    out.push(...sortRot(reg.filter(n=>!isOrientee(n)),hist,ag.length?'':prev,null,usedToday));
    out.push(...sortRot(reg.filter(isOrientee),hist,'',null,usedToday));
    out=uniq(out);all.forEach(n=>{if(!out.includes(n))out.push(n);});
    if(out.length>1&&usedToday.has(out[0])){const i=out.findIndex(n=>!usedToday.has(n));if(i>0){const n=out.splice(i,1)[0];out.unshift(n);}}
    store[dateKey][shiftKey]=out;saveCA(store);return out;
  }

  function list(order,empty){if(!order.length)return '<div style="padding:6px;color:#6b7280;font-style:italic;font-size:9.5pt;">'+empty+'</div>';return order.map((n,i)=>{const suf=i===0?'st':i===1?'nd':i===2?'rd':'th',badge=isAgency(n)?' <span style="font-size:7pt;font-weight:800;color:#7c2d12;background:#ffedd5;border:1px solid #fdba74;padding:1px 4px;border-radius:2px;">AGENCY</span>':'';return '<div style="padding:4px 6px;border-bottom:1px solid #dbe5ef;font-size:9.6pt;line-height:1.18;'+(i===0?'font-weight:800;color:#0f4c81;background:#e0f2fe;':'')+'"><b style="display:inline-block;width:29px;">'+(i+1)+suf+'</b>'+esc(n)+badge+'</div>';}).join('');}
  function rnBlock(d){const day=buildRN(d,'DAY'),night=buildRN(d,'NIGHT');return '<div class="first-admission-print" style="margin:9px 0 0;padding:8px 10px;border:1.5px solid #0f4c81;border-radius:4px;background:#f8fbff;page-break-inside:avoid;"><div style="font-size:11pt;font-weight:800;text-transform:uppercase;color:#0f4c81;margin-bottom:5px;">RN Admission Order</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr><th style="width:50%;border:1px solid #9fbad0;padding:5px;background:#eef6ff;font-size:10pt;">☀ Day Shift</th><th style="width:50%;border:1px solid #9fbad0;padding:5px;background:#eef6ff;font-size:10pt;">🌙 Night Shift</th></tr><tr><td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">'+list(day,'No eligible 3B RN assigned')+'</td><td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">'+list(night,'No eligible 3B RN assigned')+'</td></tr></table></div>';}
  function caBlock(d){const orders=CA_SHIFTS.map(s=>buildCA(d,s.key));return '<div class="ca-admission-print" style="margin:8px 0 0;padding:8px 10px;border:1.5px solid #0e7490;border-radius:4px;background:#f5fcfd;page-break-inside:avoid;"><div style="font-size:11pt;font-weight:800;text-transform:uppercase;color:#0e7490;margin-bottom:5px;">CA Admission Order</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>'+CA_SHIFTS.map(s=>'<th style="border:1px solid #8cc7d1;padding:5px 3px;background:#ecfeff;font-size:9pt;">'+s.label+'</th>').join('')+'</tr><tr>'+orders.map(a=>'<td style="border:1px solid #8cc7d1;vertical-align:top;padding:0;">'+list(a,'No eligible CA')+'</td>').join('')+'</tr></table></div>';}
  function css(){return '<style id="cc-one-page-print-fix">@page{size:letter portrait!important;margin:.22in .28in!important}@media print{html,body{margin:0!important;padding:0!important}.ps-page{padding:0!important;margin:0 auto!important;max-width:none!important;width:100%!important;min-height:0!important;height:auto!important}.ps-title{font-size:21pt!important;margin:0 0 4px!important;line-height:1.08!important}.ps-date{font-size:11pt!important;margin:0 0 8px!important}.ps-section-label{font-size:11pt!important;margin:7px 0 3px!important;padding-bottom:3px!important}.ps-table{margin-bottom:4px!important}.ps-table th{font-size:10pt!important;padding:5px!important}.ps-table td{font-size:10.6pt!important;padding:5px!important;line-height:1.18!important}.ps-notes-label{font-size:9pt!important}.ps-notes-text{font-size:9.5pt!important;line-height:1.18!important}.ps-footer{font-size:8pt!important;margin-top:6px!important;padding-top:4px!important}.first-admission-print,.ca-admission-print{margin-top:8px!important}}</style>';}
  function fitScript(){return '<script id="cc-fit-one-page">(function(){function fit(){try{var p=document.querySelector(".ps-page")||document.body;document.body.style.zoom="1";var h=p.getBoundingClientRect().height,max=(11-.50)*96;if(h>max)document.body.style.zoom=String(Math.max(.84,Math.min(1,max/h)));}catch(e){}}window.addEventListener("load",function(){fit();setTimeout(function(){fit();window.print();},120);});})();<\/script>';}
  function bottom(html,block){if(/<div class=["']ps-footer["']/.test(html))return {html:html.replace(/(<div class=["']ps-footer["'][^>]*>)/,block+'$1'),done:true};if(/<\/body>/i.test(html))return {html:html.replace(/<\/body>/i,block+'</body>'),done:true};return {html,done:false};}
  function wrap(fn){const original=window[fn];if(typeof original!=='function'||original.__ccRotationV4)return;const wrapped=function(){const d=state.activeBoardDate||'',block=d?rnBlock(d)+caBlock(d):'',realOpen=window.open;window.open=function(){const child=realOpen.apply(window,arguments);if(!child||!block)return child;try{const rw=child.document.write.bind(child.document);let done=false;child.document.write=function(html){if(typeof html==='string'){if(!done&&!html.includes('ca-admission-print')){const r=bottom(html,block);html=r.html;done=r.done;}if(fn==='printNursingServices'){html=html.replace('</head>',css()+'</head>');html=html.replace(/<script>window\.onload=function\(\)\{window\.print\(\);\}<\/script>/,fitScript());}}return rw(html);};}catch(e){}return child;};let result;try{result=original.apply(this,arguments);}catch(e){window.open=realOpen;throw e;}if(result&&typeof result.then==='function')return result.finally(()=>{window.open=realOpen;});window.open=realOpen;return result;};wrapped.__ccRotationV4=true;window[fn]=wrapped;try{eval(fn+' = window[fn]');}catch(e){}}

  function scheduledCA(d,k){return uniq(rows(d,[k]).filter(x=>x&&x.role==='CA'));}
  function save3CCA(k,n){const d=state.activeChargeDate||state.activeBoardDate;if(!d)return;state.staff3C=state.staff3C||{};const key=d+'|'+k;state.staff3C[key]=state.staff3C[key]||{};if(n)state.staff3C[key].ca=n;else delete state.staff3C[key].ca;try{if(typeof persistSave==='function')persistSave();}catch(e){}render3CCA();}
  window.save3CCA=save3CCA;
  function render3CCA(){const host=document.getElementById('charge-assignments');if(!host||typeof state==='undefined')return;let card=document.getElementById('cc-ca-3c-assign');if(!card){card=document.createElement('div');card.id='cc-ca-3c-assign';card.className='card';card.style.marginTop='12px';host.parentNode.insertBefore(card,host.nextSibling);}const d=state.activeChargeDate||state.activeBoardDate||'';card.innerHTML='<div class="card-header"><div><div class="card-title">🩺 3C Clinical Assistant Assignment</div><div style="font-size:11px;color:var(--text2);margin-top:2px;">Assigned 3C CAs, floats, and sitters are automatically removed from the CA admission rotation. A CA who was first earlier in the day will not be first again after a shift change when another eligible CA is available.</div></div></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">'+CA_SHIFTS.map(s=>{const key=d+'|'+s.key,selected=(((state.staff3C||{})[key]||{}).ca)||'',opts=scheduledCA(d,s.key);if(selected&&!opts.includes(selected))opts.push(selected);return '<div><div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:4px;">'+s.label+'</div><select onchange="save3CCA(\''+s.key+'\',this.value)" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:5px;color:var(--white);padding:7px;font-size:11px;"><option value="">— Not assigned —</option>'+opts.map(n=>'<option value="'+esc(n)+'" '+(n===selected?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></div>';}).join('')+'</div>';}
  function hookCharge(){const o=window.renderChargeAssignments;if(typeof o==='function'&&!o.__ccCA3C){const w=function(){const r=o.apply(this,arguments);setTimeout(render3CCA,0);return r;};w.__ccCA3C=true;window.renderChargeAssignments=w;try{eval('renderChargeAssignments = window.renderChargeAssignments');}catch(e){}}render3CCA();}
  function install(){if(typeof state==='undefined')return;wrap('printNursingServices');wrap('printStaffingSheet');hookCharge();}
  let tries=0;const t=setInterval(function(){install();if(++tries>40)clearInterval(t);},250);
})();