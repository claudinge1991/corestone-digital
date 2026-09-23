// CAD & 3D Design intake. Static-site fallback: nothing is uploaded or stored by this page.
// The ID is a browser-made draft reference, not proof of receipt or a server-issued ID.
// The request is assembled in the browser and handed to the customer's own email app.
(function(root){
const CAD_EMAIL='hello@corestoneohio.com';
const MAX_FILES=10;
const MAX_FILE_BYTES=20*1024*1024;
const ALLOWED_EXT=['jpg','jpeg','png','heic','webp','pdf','stl','step','stp','3mf','obj','iges','igs','dxf','dwg'];
const ID_ALPHABET='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const FIELDS=[['name','Name'],['email','Email'],['phone','Phone'],['company','Business or company'],['contact','Preferred contact'],['use','Intended use'],['dimensions','Dimensions'],['method','Manufacturing method'],['material','Material'],['fit','Fit requirements'],['formats','Preferred file formats (preference, not a promised deliverable)'],['deadline','Deadline'],['budget','Budget'],['description','Project description']];

function makeRequestId(date,bytes){
  const d=date.toISOString().slice(0,10).replace(/-/g,'');
  let s='';for(let i=0;i<6;i++)s+=ID_ALPHABET[bytes[i]&31];
  return `CAD-${d}-${s}`;
}
function randomBytes(n){const b=new Uint8Array(n);root.crypto.getRandomValues(b);return b}

function checkFiles(files){
  const ok=[],errors=[];
  if(files.length>MAX_FILES)errors.push(`Choose up to ${MAX_FILES} reference files.`);
  for(const f of Array.from(files).slice(0,MAX_FILES)){
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    if(!f.name.includes('.')||!ALLOWED_EXT.includes(ext))errors.push(`${f.name}: file type not accepted.`);
    else if(f.size>MAX_FILE_BYTES)errors.push(`${f.name}: larger than 20 MB.`);
    else ok.push({name:f.name,size:f.size});
  }
  return {ok,errors};
}

// data: plain object of field values (formats as an array, dimsUnknown as boolean).
function validate(data){
  const errors=[];
  const need=(k,msg)=>{if(!String(data[k]||'').trim())errors.push(msg)};
  need('name','Enter your name.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email||'').trim()))errors.push('Enter a valid email address.');
  need('contact','Choose a preferred contact method.');
  need('use','Choose the intended use.');
  if(!data.dimsUnknown)need('dimensions','Enter approximate dimensions, or check “Unknown”.');
  need('method','Choose a manufacturing method, or “Unsure”.');
  need('description','Describe the object.');
  if(!data.consent)errors.push('Confirm that Corestone may contact you about this request.');
  return errors;
}

function formatSize(n){return n>=1048576?`${(n/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(n/1024))} KB`}

function buildSummary(id,data,files){
  const val=k=>{
    if(k==='dimensions'&&data.dimsUnknown)return 'Unknown';
    if(k==='formats')return (data.formats||[]).join(', ')||'—';
    return String(data[k]||'').trim()||'—';
  };
  const lines=[`Corestone CAD & 3D Design request · draft reference ${id}`,'(Draft reference made in the sender\'s browser. Not proof of receipt.)','',...FIELDS.map(([k,l])=>`${l}: ${val(k)}`),'','Reference files selected (names only, NOT attached. Attach them to this email before sending):'];
  lines.push(...(files.length?files.map(f=>`- ${f.name} (${formatSize(f.size)})`):['- None']));
  return lines.join('\n');
}

function mailtoHref(id,summary){
  return `mailto:${CAD_EMAIL}?subject=${encodeURIComponent(`CAD request (draft ref ${id})`)}&body=${encodeURIComponent(summary)}`;
}

const api={CAD_EMAIL,MAX_FILES,MAX_FILE_BYTES,ALLOWED_EXT,makeRequestId,checkFiles,validate,buildSummary,mailtoHref,formatSize};
root.CorestoneCad=api;

const form=root.document&&root.document.querySelector('#cad-form');
if(!form)return;
const $=s=>form.querySelector(s);
const dims=$('#dimensions'),unknown=$('#dims-unknown'),fileInput=$('#references'),fileList=$('#file-list'),errorBox=document.querySelector('#cad-errors');
const syncDims=()=>{dims.disabled=unknown.checked;dims.required=!unknown.checked;if(unknown.checked)dims.value=''};
unknown.addEventListener('change',syncDims);syncDims();
const deadline=$('#deadline');if(deadline)deadline.min=new Date().toISOString().slice(0,10);
const showFiles=()=>{
  const {ok,errors}=checkFiles(fileInput.files);
  fileList.innerHTML='';
  for(const f of ok){const li=document.createElement('li');li.textContent=`${f.name} · ${formatSize(f.size)}`;fileList.appendChild(li)}
  for(const e of errors){const li=document.createElement('li');li.className='bad';li.textContent=e;fileList.appendChild(li)}
  return {ok,errors};
};
fileInput.addEventListener('change',showFiles);

form.addEventListener('submit',e=>{
  e.preventDefault();
  const d=new FormData(form);
  if(d.get('website'))return;
  const data=Object.fromEntries(['name','email','phone','company','contact','use','dimensions','method','material','fit','deadline','budget','description'].map(k=>[k,d.get(k)||'']));
  data.formats=d.getAll('formats');data.dimsUnknown=unknown.checked;data.consent=!!d.get('consent');
  const files=showFiles();
  const errors=[...validate(data),...files.errors];
  errorBox.innerHTML='';
  if(errors.length){
    const ul=document.createElement('ul');for(const m of errors){const li=document.createElement('li');li.textContent=m;ul.appendChild(li)}
    errorBox.appendChild(ul);errorBox.hidden=false;errorBox.focus();return;
  }
  errorBox.hidden=true;
  const id=makeRequestId(new Date(),randomBytes(6));
  const summary=buildSummary(id,data,files.ok);
  const href=mailtoHref(id,summary);
  const done=document.querySelector('#cad-confirm');
  done.querySelector('[data-id]').textContent=id;
  done.querySelector('[data-mail]').href=href;
  done.querySelector('[data-summary]').value=summary;
  done.querySelector('[data-files]').hidden=!files.ok.length;
  done.hidden=false;form.hidden=true;done.focus();done.scrollIntoView({block:'start'});
  const a=document.createElement('a');a.href=href;a.click();
});
const copy=document.querySelector('#cad-copy');
if(copy)copy.addEventListener('click',async()=>{
  const t=document.querySelector('#cad-confirm [data-summary]');
  try{await navigator.clipboard.writeText(t.value);copy.textContent='Copied'}catch(_){t.select();copy.textContent='Selected — press Copy'}
});
})(typeof window!=='undefined'?window:globalThis);
