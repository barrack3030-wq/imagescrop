const TARGET_W=1200,TARGET_H=1500,COLS=3,ROWS=2;
const fileInput=document.querySelector('#fileInput'),browseBtn=document.querySelector('#browseBtn'),replaceBtn=document.querySelector('#replaceBtn'),dropzone=document.querySelector('#dropzone'),sourcePanel=document.querySelector('#sourcePanel'),resultsPanel=document.querySelector('#resultsPanel'),sourceCanvas=document.querySelector('#sourceCanvas'),sourceDimensions=document.querySelector('#sourceDimensions'),fileName=document.querySelector('#fileName'),fileSize=document.querySelector('#fileSize'),cards=document.querySelector('#cards'),message=document.querySelector('#message'),downloadZip=document.querySelector('#downloadZip'),downloadAll=document.querySelector('#downloadAll');

const cropModal=document.querySelector('#cropModal'),cropTitle=document.querySelector('#cropTitle'),closeCrop=document.querySelector('#closeCrop'),cancelCrop=document.querySelector('#cancelCrop'),applyCrop=document.querySelector('#applyCrop'),resetCrop=document.querySelector('#resetCrop'),editorCanvas=document.querySelector('#editorCanvas'),editorWrap=document.querySelector('.editor-wrap'),zoomRange=document.querySelector('#zoomRange'),zoomValue=document.querySelector('#zoomValue');

let outputs=[],sourceImageCanvas=null,sourceFile=null,currentIndex=-1,workingCrop=null,isDragging=false,lastPointer={x:0,y:0};

function showError(t){message.textContent=t;message.classList.remove('hidden')}
function clearError(){message.classList.add('hidden');message.textContent=''}
function formatBytes(b){if(b<1024)return b+' B';const u=['KB','MB','GB'];let i=-1;do{b/=1024;i++}while(b>=1024&&i<u.length-1);return b.toFixed(i?1:0)+' '+u[i]}
function triggerDownload(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function canvasBlob(c){return new Promise(r=>c.toBlob(r,'image/png'))}

function defaultCrop(index){return{x:(index%COLS)*TARGET_W,y:Math.floor(index/COLS)*TARGET_H,zoom:1}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

function makeSlice(crop){
  const c=document.createElement('canvas');c.width=TARGET_W;c.height=TARGET_H;
  const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
  const sw=TARGET_W/crop.zoom,sh=TARGET_H/crop.zoom;
  const sx=clamp(crop.x,0,3600-sw),sy=clamp(crop.y,0,3000-sh);
  x.drawImage(sourceImageCanvas,sx,sy,sw,sh,0,0,TARGET_W,TARGET_H);
  return c
}

async function updateOutput(index,crop){
  const canvas=makeSlice(crop),blob=await canvasBlob(canvas);
  if(outputs[index])URL.revokeObjectURL(outputs[index].url);
  outputs[index]={blob,url:URL.createObjectURL(blob),crop:{...crop}};
  const img=cards.querySelector('[data-index="'+index+'"] img');
  if(img)img.src=outputs[index].url
}

function renderCards(){
  cards.innerHTML='';
  outputs.forEach((item,i)=>{
    const card=document.createElement('article');card.className='card';card.dataset.index=i;
    const preview=document.createElement('div');preview.className='card-preview';
    const img=document.createElement('img');img.src=item.url;img.alt='Slice '+String(i+1).padStart(2,'0');preview.appendChild(img);
    const body=document.createElement('div');body.className='card-body';
    const top=document.createElement('div');top.className='card-top';
    const meta=document.createElement('div');meta.innerHTML='<div class="card-number">SLICE '+String(i+1).padStart(2,'0')+'</div><div class="card-size">1200 × 1500 PNG</div>';
    top.appendChild(meta);body.appendChild(top);
    const actions=document.createElement('div');actions.className='card-actions';
    const adjust=document.createElement('button');adjust.className='adjust-one';adjust.type='button';adjust.textContent='Adjust Crop';adjust.onclick=()=>openCrop(i);
    const download=document.createElement('button');download.className='download-one';download.type='button';download.textContent='Download';download.onclick=()=>triggerDownload(outputs[i].blob,'slice-'+String(i+1).padStart(2,'0')+'.png');
    actions.append(adjust,download);body.appendChild(actions);card.append(preview,body);cards.appendChild(card)
  })
}

function drawEditor(){
  if(!sourceImageCanvas||!workingCrop)return;
  const ctx=editorCanvas.getContext('2d'),cw=editorCanvas.width,ch=editorCanvas.height;
  ctx.clearRect(0,0,cw,ch);
  const scale=.5*workingCrop.zoom;
  const dw=3600*scale,dh=3000*scale;
  const dx=-workingCrop.x*scale,dy=-workingCrop.y*scale;
  ctx.drawImage(sourceImageCanvas,0,0,3600,3000,dx,dy,dw,dh);
  zoomValue.textContent=workingCrop.zoom.toFixed(2)+'×'
}

function openCrop(index){
  if(!sourceImageCanvas)return;
  currentIndex=index;
  workingCrop={...(outputs[index].crop||defaultCrop(index))};
  cropTitle.textContent='Adjust Slice '+String(index+1).padStart(2,'0');
  zoomRange.value=workingCrop.zoom;
  drawEditor();
  cropModal.classList.remove('hidden');cropModal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden'
}

function closeEditor(){
  cropModal.classList.add('hidden');cropModal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';currentIndex=-1;workingCrop=null
}

function resetEditor(){
  if(currentIndex<0)return;
  workingCrop=defaultCrop(currentIndex);zoomRange.value=workingCrop.zoom;drawEditor()
}

function pointerPosition(e){
  const r=editorCanvas.getBoundingClientRect();
  return{x:(e.clientX-r.left)*(editorCanvas.width/r.width),y:(e.clientY-r.top)*(editorCanvas.height/r.height)}
}

editorWrap.addEventListener('pointerdown',e=>{
  if(cropModal.classList.contains('hidden'))return;
  isDragging=true;editorWrap.classList.add('dragging');editorWrap.setPointerCapture(e.pointerId);lastPointer=pointerPosition(e)
});
editorWrap.addEventListener('pointermove',e=>{
  if(!isDragging||!workingCrop)return;
  const p=pointerPosition(e),dx=p.x-lastPointer.x,dy=p.y-lastPointer.y;
  const scale=.5*workingCrop.zoom;
  const sw=TARGET_W/workingCrop.zoom,sh=TARGET_H/workingCrop.zoom;
  workingCrop.x=clamp(workingCrop.x-dx/scale,0,3600-sw);
  workingCrop.y=clamp(workingCrop.y-dy/scale,0,3000-sh);
  lastPointer=p;drawEditor()
});
function endDrag(){isDragging=false;editorWrap.classList.remove('dragging')}
editorWrap.addEventListener('pointerup',endDrag);editorWrap.addEventListener('pointercancel',endDrag);

zoomRange.addEventListener('input',()=>{
  if(!workingCrop)return;
  const oldZoom=workingCrop.zoom,newZoom=Number(zoomRange.value);
  const oldW=TARGET_W/oldZoom,oldH=TARGET_H/oldZoom,newW=TARGET_W/newZoom,newH=TARGET_H/newZoom;
  const cx=workingCrop.x+oldW/2,cy=workingCrop.y+oldH/2;
  workingCrop.zoom=newZoom;
  workingCrop.x=clamp(cx-newW/2,0,3600-newW);
  workingCrop.y=clamp(cy-newH/2,0,3000-newH);
  drawEditor()
});

applyCrop.onclick=async()=>{
  if(currentIndex<0||!workingCrop)return;
  applyCrop.disabled=true;applyCrop.textContent='Applying…';
  try{await updateOutput(currentIndex,workingCrop);closeEditor()}catch(e){console.error(e);showError('Could not apply this crop. Please try again.')}
  finally{applyCrop.disabled=false;applyCrop.textContent='Apply Crop'}
};
resetCrop.onclick=resetEditor;
closeCrop.onclick=closeEditor;cancelCrop.onclick=closeEditor;
cropModal.addEventListener('click',e=>{if(e.target.hasAttribute('data-close-modal'))closeEditor()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!cropModal.classList.contains('hidden'))closeEditor()});

async function processFile(file){
  clearError();
  if(!file||!file.type.startsWith('image/'))return showError('Please choose a JPG, PNG or WebP image.');
  if(file.size>40*1024*1024)return showError('This image is over 40 MB. Please use a smaller file.');
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=async()=>{
    try{
      const w=img.naturalWidth,h=img.naturalHeight;
      if(w<3600||h<3000){showError('This image is '+w+' × '+h+'. For exact 1200 × 1500 slices, use an image at least 3600 × 3000 px.');URL.revokeObjectURL(url);return}
      sourceImageCanvas=document.createElement('canvas');sourceImageCanvas.width=3600;sourceImageCanvas.height=3000;
      const ctx=sourceImageCanvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const scale=Math.max(3600/w,3000/h),dw=w*scale,dh=h*scale;
      ctx.drawImage(img,(3600-dw)/2,(3000-dh)/2,dw,dh);

      sourceCanvas.width=3600;sourceCanvas.height=3000;sourceCanvas.getContext('2d').drawImage(sourceImageCanvas,0,0);
      sourceDimensions.textContent=w+' × '+h+' px source';
      fileName.textContent=file.name;fileSize.textContent=formatBytes(file.size);sourceFile=file;

      outputs.forEach(x=>URL.revokeObjectURL(x.url));outputs=[];
      for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
        const crop=defaultCrop(row*COLS+col);
        const blob=await canvasBlob(makeSlice(crop));
        outputs.push({blob,url:URL.createObjectURL(blob),crop})
      }
      renderCards();sourcePanel.classList.remove('hidden');resultsPanel.classList.remove('hidden');dropzone.classList.add('hidden');
      if(w!==3600||h!==3000)showError('Source was '+w+' × '+h+'. It was center-cropped to 3600 × 3000 before slicing. You can now adjust each panel individually.');
    }catch(e){console.error(e);showError('Something went wrong while processing the image. Please try again.')}
    finally{URL.revokeObjectURL(url)}
  };
  img.onerror=()=>{showError('The image could not be read.');URL.revokeObjectURL(url)};img.src=url
}

browseBtn.onclick=e=>{e.stopPropagation();fileInput.click()};
replaceBtn.onclick=()=>fileInput.click();
dropzone.addEventListener('click',e=>{if(e.target!==browseBtn)fileInput.click()});
dropzone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')fileInput.click()});
fileInput.addEventListener('change',e=>processFile(e.target.files[0]));
['dragenter','dragover'].forEach(t=>dropzone.addEventListener(t,e=>{e.preventDefault();dropzone.classList.add('dragover')}));
['dragleave','drop'].forEach(t=>dropzone.addEventListener(t,e=>{e.preventDefault();dropzone.classList.remove('dragover')}));
dropzone.addEventListener('drop',e=>processFile(e.dataTransfer.files[0]));

downloadAll.onclick=async()=>{
  if(!outputs.length)return;downloadAll.disabled=true;
  outputs.forEach((x,i)=>setTimeout(()=>triggerDownload(x.blob,'slice-'+String(i+1).padStart(2,'0')+'.png'),i*250));
  setTimeout(()=>downloadAll.disabled=false,outputs.length*250+500)
};

downloadZip.onclick=async()=>{
  if(!outputs.length)return;
  if(typeof JSZip==='undefined')return showError('ZIP library could not load. Use “Download 6 PNGs” instead.');
  downloadZip.disabled=true;downloadZip.textContent='Creating ZIP…';
  try{
    const zip=new JSZip();outputs.forEach((x,i)=>zip.file('slice-'+String(i+1).padStart(2,'0')+'.png',x.blob));
    const blob=await zip.generateAsync({type:'blob',compression:'STORE'});
    triggerDownload(blob,'slice6-1200x1500.zip')
  }finally{downloadZip.disabled=false;downloadZip.textContent='Download ZIP'}
};