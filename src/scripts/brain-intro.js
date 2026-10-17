import brainMesh from '../assets/brain-mesh.json';
import { initTimeline } from './timeline.js';

(() => {
  'use strict';
  document.body.classList.add('intro-open');
  const $ = id => document.getElementById(id);
  const cv=$('brain-canvas'),ctx=cv.getContext('2d'),intro=$('intro');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hit=$('core-hit'),leftHit=$('core-hit-left'),rightHit=$('core-hit-right');
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const smooth=(x)=>{x=clamp(x);return x*x*(3-2*x)};
  const mix=(a,b,t)=>a+(b-a)*t;
  let seed=67102;
  function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  // Anatomical lateral silhouette, lifted into two genuinely volumetric hemispheres.
  // Anterior = -X, superior = +Y, transverse = Z; camera starts at eye level.
  // Anatomical lateral silhouette, lifted into two genuinely volumetric hemispheres.
  // Anterior = -X, superior = +Y, transverse = Z; camera starts at eye level.
  // Anatomical lateral silhouette, lifted into two genuinely volumetric hemispheres.
  // Anterior = -X, superior = +Y, transverse = Z; camera starts at eye level.
  // FreeSurfer fsaverage5 pial anatomy, distributed with Nilearn. Attribution in HTML head.
  // FreeSurfer fsaverage5 pial anatomy, distributed with Nilearn. Attribution in HTML head.
  // FreeSurfer fsaverage5 pial anatomy, distributed with Nilearn. Attribution in HTML head.
  const points=[],edges=[];
  const meshData=brainMesh;
  const surface=$('brain-surface');
  const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
  let surfaceProgram=null,surfaceCount=0,surfaceUniforms={};
  function decode(s,Type){const raw=atob(s),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Type(bytes.buffer);}
  const positionsQ=decode(meshData.positions,Int16Array),normalsQ=decode(meshData.normals,Int8Array);
  const meshPositions=Float32Array.from(positionsQ,v=>v/10000),meshNormals=Float32Array.from(normalsQ,v=>v/127);
  const meshIndices=decode(meshData.indices,Uint16Array);
  if(gl){
    function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
    const vs=shader(gl.VERTEX_SHADER,`
      attribute vec3 aPosition;attribute vec3 aNormal;
      uniform vec2 uView;uniform vec2 uCenter;uniform vec2 uPan;uniform vec2 uCore;
      uniform vec2 uRotation;uniform float uBase;uniform float uZoom;uniform float uShift;
      varying vec3 vNormal;varying vec3 vPosition;
      vec3 spin(vec3 p){float cy=cos(uRotation.x),sy=sin(uRotation.x),cx=cos(uRotation.y),sx=sin(uRotation.y);vec3 r=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);return vec3(r.x,r.y*cx-r.z*sx,r.y*sx+r.z*cx);}
      void main(){vec3 p=spin(aPosition);float s=4.8/(4.8-p.z);
        vec2 local=vec2(p.x,-p.y)*uBase*uZoom*s;
        vec2 pixel=uCenter+uPan+local-uCore*(uZoom-1.0)-(uCenter+uPan+uCore-vec2(uView.x*.5,uView.y*.54))*uShift;
        gl_Position=vec4(pixel.x/uView.x*2.0-1.0,1.0-pixel.y/uView.y*2.0,0.,1.);
        vNormal=spin(aNormal);vPosition=p;
      }`);
    const fs=shader(gl.FRAGMENT_SHADER,`
      precision mediump float;varying vec3 vNormal;varying vec3 vPosition;uniform float uAlpha;
      void main(){vec3 n=normalize(vNormal),view=normalize(vec3(0.,0.,4.8)-vPosition);float facing=abs(dot(n,view));
        float rim=pow(1.-facing,2.7);vec3 light=normalize(vec3(-.6,.8,1.5));
        float diffuse=abs(dot(n,light));float spec=pow(abs(dot(reflect(-light,n),view)),24.);
        float alpha=(.028+rim*.24+spec*.065)*uAlpha;
        vec3 ice=mix(vec3(.38,.65,.95),vec3(.85,.95,1.),rim*.85+spec*.15);
        gl_FragColor=vec4(ice*(.9+diffuse*.35),alpha);
      }`);
    surfaceProgram=gl.createProgram();gl.attachShader(surfaceProgram,vs);gl.attachShader(surfaceProgram,fs);gl.linkProgram(surfaceProgram);
    if(!gl.getProgramParameter(surfaceProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(surfaceProgram));
    gl.useProgram(surfaceProgram);
    for(const [name,data] of [['aPosition',meshPositions],['aNormal',meshNormals]]){
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      const location=gl.getAttribLocation(surfaceProgram,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
    }
    const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,meshIndices,gl.STATIC_DRAW);surfaceCount=meshIndices.length;
    for(const name of ['uView','uCenter','uPan','uCore','uRotation','uBase','uZoom','uShift','uAlpha'])surfaceUniforms[name]=gl.getUniformLocation(surfaceProgram,name);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
  }
  function drawSurface(ry,rx,zoom,shift,opacity){
    if(!gl)return;
    if(surface.width!==cv.width||surface.height!==cv.height){surface.width=cv.width;surface.height=cv.height;gl.viewport(0,0,surface.width,surface.height);}
    gl.clear(gl.COLOR_BUFFER_BIT);if(opacity<=0)return;
    gl.useProgram(surfaceProgram);
    for(const [name,value] of [['uView',[W,H]],['uCenter',[cx,cy]],['uPan',[pan.x,pan.y]],['uCore',[startCore.x,startCore.y]],['uRotation',[ry,rx]]])gl.uniform2f(surfaceUniforms[name],...value);
    for(const [name,value] of [['uBase',base],['uZoom',zoom],['uShift',shift],['uAlpha',opacity]])gl.uniform1f(surfaceUniforms[name],value);
    gl.drawElements(gl.TRIANGLES,surfaceCount,gl.UNSIGNED_SHORT,0);
  }
  // A sparse suspended network surrounds the anatomy; all points share its 3D rotation.
  for(let i=0;i<meshData.vertexCount;i+=67){
    const k=i*3;points.push({x:meshPositions[k],y:meshPositions[k+1],z:meshPositions[k+2],n:{x:meshNormals[k],y:meshNormals[k+1],z:meshNormals[k+2]},phase:rand()*6.28,size:.55+rand()*.55,cloud:false});
  }
  for(let i=0;i<125;i++){
    const y=rand()*2-1,a=rand()*Math.PI*2,r=Math.sqrt(1-y*y),x=Math.cos(a)*r,z=Math.sin(a)*r;
    points.push({x:x*(1.55+rand()*.35),y:y*(1.19+rand()*.25),z:z*(1.21+rand()*.24),n:{x,y,z},phase:rand()*6.28,size:.8+rand()*1.8,cloud:true});
  }
  const seen=new Set();
  for(let i=0;i<points.length;i++){
    const p=points[i],near=[];
    for(let j=0;j<points.length;j++){if(j===i)continue;const q=points[j],d=(p.x-q.x)**2+(p.y-q.y)**2+(p.z-q.z)**2;if(d<(p.cloud?.9:.52)**2)near.push({j,d});}
    near.sort((a,b)=>a.d-b.d);
    for(const {j} of near.slice(0,p.cloud?4:2)){const a=Math.min(i,j),b=Math.max(i,j),key=a+':'+b;if(!seen.has(key)){seen.add(key);edges.push([a,b]);}}
  }
  const anchors=meshData.anchors.map(p=>({x:p[0],y:p[1],z:p[2]+.025}));
  const stars=Array.from({length:65},()=>({x:rand(),y:rand(),r:.3+rand()*.8,p:rand()*6.3}));
  let W=0,H=0,DPR=1,mobile=false,base=1,cx=0,cy=0;
  let state='idle',started=0,pausedAt=0,frame=0,epoch=performance.now(),timelineStarted=false;
  let yaw=-.20,pitch=0,frozenYaw=0,frozenPitch=0;
  let pan={x:0,y:0},velocity={x:0,y:0},drag=null,motionMode='rotate',suppressClickUntil=0,lastRender=0;
  let projected=[],currentCore={x:0,y:0},startCore={x:0,y:0};
  function resize(){
    W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);mobile=W<=680;
    cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);
    base=mobile?Math.min(W*.25,H*.135):Math.min(W*.15,H*.215);
    cx=W*(mobile?.50:.70);cy=H*(mobile?.625:.50);
  }
  addEventListener('resize',resize);resize();
  function rotate(p,ry,rx){
    const x=p.x*Math.cos(ry)+p.z*Math.sin(ry),z=-p.x*Math.sin(ry)+p.z*Math.cos(ry);
    return {x,y:p.y*Math.cos(rx)-z*Math.sin(rx),z:p.y*Math.sin(rx)+z*Math.cos(rx)};
  }
  function project(p,ry,rx,zoom=1,shift=0){
    const r=rotate(p,ry,rx),scale=4.8/(4.8-r.z);
    return {x:cx+pan.x+r.x*base*zoom*scale-startCore.x*(zoom-1)-(cx+pan.x+startCore.x-W/2)*shift,y:cy+pan.y-r.y*base*zoom*scale-startCore.y*(zoom-1)-(cy+pan.y+startCore.y-H*.54)*shift,z:r.z,scale};
  }
  function glow(x,y,r,color,alpha=1){
    ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(167,139,250,0)');
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1;
  }
  // Same sampled chirp and viewBox mapping as the existing Timeline.astro.
  const originalWave=[];let ph=0;
  for(let i=0;i<=3000;i++){const u=i/3000,x=u*7200;originalWave.push({x,y:392-(62+34*u)*Math.sin(ph)});ph+=Math.PI*2*(1/400)*Math.pow((1/70)/(1/400),u)*2.4;}
  let firstPeak=0,distance=Infinity;
  for(let i=2;i<2999;i++){if((originalWave[i].y-originalWave[i-1].y)*(originalWave[i+1].y-originalWave[i].y)<0 && Math.abs(originalWave[i].x-450)<distance){firstPeak=i;distance=Math.abs(originalWave[i].x-450);}}
  function targetAt(x){
    const s=Math.max(W/1400,H/760),p=originalWave[firstPeak];
    const world=(x-(W-1400*s)/2)/s-700+p.x;
    const f=clamp(world/2.4,0,3000),i=Math.floor(f),v=originalWave[i],next=originalWave[Math.min(3000,i+1)];
    return (H-760*s)/2+mix(v.y,next.y,f-i)*s;
  }
  function eegAt(x,t){const u=x/W;return H*.54+Math.min(H*.09,60)*(Math.sin(u*61+t*.001)*.44+Math.sin(u*109+1.2)*.22+Math.sin(u*173-.7)*.15+Math.sin(u*35)*.19)*(.35+.65*Math.pow(Math.sin(u*Math.PI),2));}
  function background(t,fade=1){
    for(const s of stars){ctx.globalAlpha=(.12+.25*(.5+.5*Math.sin(t*.0004+s.p)))*fade;ctx.fillStyle='#c5b2eb';ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    if(fade>.1){ctx.strokeStyle=`rgba(143,112,191,${.075*fade})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(W*.06,H*.87);ctx.lineTo(W*.94,H*.87);ctx.stroke();}
  }
  function orbit(t,alpha){
    const x=cx,y=cy+base*1.34,rx=base*1.48,ry=base*.20;
    ctx.strokeStyle=`rgba(163,129,220,${.16*alpha})`;ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(x,y,rx,ry,-.06,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=`rgba(177,145,221,${.12*alpha})`;ctx.beginPath();ctx.ellipse(x,y,rx*1.1,ry*1.1,-.06,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<48;i++){const a=i/48*Math.PI*2;ctx.strokeStyle=`rgba(186,160,220,${(i%4===0?.34:.12)*alpha})`;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*rx,y+Math.sin(a)*ry);ctx.lineTo(x+Math.cos(a)*(rx+4),y+Math.sin(a)*(ry+3));ctx.stroke();}
    const a=t*.00015;glow(x+Math.cos(a)*rx,y+Math.sin(a)*ry,8,'rgba(181,147,231,.65)',alpha);
  }
  function drawBrain(t,elapsed){
    const flying=state==='running',z=smooth(elapsed/1550),zoom=1+z*3.7;
    const dissolve=smooth((elapsed-1150)/1300),alpha=1-smooth((elapsed-1550)/1200);
    const ry=flying?frozenYaw:yaw,rx=flying?frozenPitch:pitch;
    
    drawSurface(ry,rx,zoom,z,1-smooth((elapsed-900)/1250));
    if(alpha<=0)return;
    const shift=z;
    projected=points.map((p,i)=>{
      const q=project(p,ry,rx,zoom,shift),normal=rotate(p.n,ry,rx);
      q.visible=true;q.normal=normal;
      if(dissolve>0){const wx=((i*.61803398875)%1)*W;q.x=mix(q.x,wx,dissolve);q.y=mix(q.y,eegAt(wx,t)+(1-dissolve)*Math.sin(p.phase+t*.001)*25,dissolve);}
      return q;
    });
    ctx.lineWidth=.6;
    for(let layer=0;layer<4;layer++){
      ctx.beginPath();
      for(const [i,j] of edges){const p=projected[i],q=projected[j];const bucket=clamp(Math.floor(((p.normal.z+q.normal.z)*.5+1)*2),0,3);if(bucket!==layer)continue;ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);}
      ctx.strokeStyle=`rgba(105,160,228,${(.055+layer*.08)*alpha*(1-dissolve*.85)})`;ctx.stroke();
    }
    const order=projected.map((p,i)=>i).sort((a,b)=>projected[a].z-projected[b].z);
    for(const i of order){const p=projected[i],src=points[i];if(src.pole||!p.visible||p.x<-30||p.x>W+30||p.y<-30||p.y>H+30)continue;
      const light=clamp((p.normal.z+1)/2),pulse=.5+.5*Math.sin(src.phase+t*.0014+src.y*3);
      const a=(.10+light*.55+pulse*.12)*alpha;
      ctx.fillStyle=`rgba(198,223,255,${a})`;ctx.beginPath();ctx.arc(p.x,p.y,src.size*(.5+light*.45)*Math.min(zoom,1.6),0,Math.PI*2);ctx.fill();
      if(i%47===0&&light>.5)glow(p.x,p.y,7,'rgba(130,186,255,.35)',alpha);
    }
    if(!flying){
      const els=[hit,leftHit,rightHit];
      anchors.forEach((a,i)=>{const p=project(a,ry,rx);els[i].style.left=p.x+'px';els[i].style.top=p.y+'px';els[i].style.visibility=Math.cos(ry)>.12?'visible':'hidden';if(i===0)currentCore=p;});
      const core=project(anchors[0],ry,rx);
      if(Math.cos(ry)>.12){
        ctx.strokeStyle='rgba(238,195,115,.24)';ctx.lineWidth=.7;ctx.beginPath();
        for(const a of [anchors[1],anchors[2]]){const p=project(a,ry,rx);ctx.moveTo(core.x,core.y);ctx.lineTo(p.x,p.y);}ctx.stroke();glow(core.x,core.y,26,'rgba(244,193,99,.15)');
      }
    }else if(elapsed<1800){const core=project(anchors[0],ry,rx,zoom,shift);glow(core.x,core.y,30+z*90,'rgba(247,201,118,.35)',1-smooth(elapsed/1800));}
  }
  function drawWave(t,e){
    const appear=smooth((e-1700)/950);if(appear<=0)return;
    const morph=smooth((e-3300)/1400),reveal=clamp((e-1700)/1100);
    const grad=ctx.createLinearGradient(0,0,W,0);grad.addColorStop(0,'#8c6aff');grad.addColorStop(.45,'#c49aef');grad.addColorStop(.75,'#c6a4f2');grad.addColorStop(1,'#e9c58f');
    const path=new Path2D();const end=Math.ceil((W+4)*reveal);
    for(let x=0;x<=end;x+=2){const y=mix(eegAt(x,t),targetAt(x),morph);x===0?path.moveTo(x,y):path.lineTo(x,y);}
    ctx.lineCap='round';ctx.strokeStyle=grad;
    for(const [width,op] of [[18,.035],[8,.1],[2,1]]){ctx.lineWidth=width;ctx.globalAlpha=appear*op;ctx.stroke(path);}ctx.globalAlpha=1;
    if(reveal<1){const x=end,y=mix(eegAt(x,t),targetAt(x),morph);glow(x,y,20,'rgba(243,209,152,.45)',appear);ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fillStyle='#ffe8bb';ctx.fill();}
    if(morph>.45){const p=originalWave[firstPeak],s=Math.max(W/1400,H/760),x=W/2,y=(H-760*s)/2+p.y*s;
      ctx.globalAlpha=smooth((morph-.45)/.55);glow(x,y,23,'rgba(251,191,36,.22)',ctx.globalAlpha);ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,12*s,0,7);ctx.stroke();ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(x,y,5.5*s,0,7);ctx.fill();ctx.globalAlpha=1;}
  }
  function updateCopy(e){
    const phase=e<1900?0:e<3550?1:2;
    document.querySelectorAll('.step').forEach((el,i)=>el.classList.toggle('active',i===phase));
    $('transition-progress').style.width=clamp(e/5400)*100+'%';
    const show=e>1400&&e<4600;$('transition-copy').classList.toggle('visible',show);
    const labels=phase===2?['MODEL EVOLUTION','沿着信号，走进研究。','从 SVM 到 Bi-Mamba，探索模型如何理解脑电']:['NEURAL SIGNAL','神经活动，在时间中显现。','从一次节点激活，汇聚成一段脑电信号'];
    $('transition-kicker').textContent=labels[0];$('transition-title').textContent=labels[1];$('transition-sub').textContent=labels[2];
  }
  function render(t){
    if(state==='done')return;
    const dt=lastRender?Math.min((t-lastRender)/1000,.05):0;lastRender=t;
    if(state==='idle'&&!drag){
      yaw+=velocity.x*dt;pitch=clamp(pitch+velocity.y*dt,-1.48,1.48);
      const decay=Math.exp(-7*dt);velocity.x*=decay;velocity.y*=decay;
      if(Math.abs(velocity.x)<.002)velocity.x=0;if(Math.abs(velocity.y)<.002)velocity.y=0;
    }
    ctx.clearRect(0,0,W,H);
    const e=state==='running'?t-started:0;
    background(t,1-smooth((e-3000)/2400));
    drawBrain(t,e);
    if(state==='running'){drawWave(t,e);updateCopy(e);if(e>=4700&&!document.body.classList.contains('timeline-visible'))startTimeline();if(e>=4850)intro.classList.add('finished');if(e>=5850){complete();return;}}
    frame=requestAnimationFrame(render);
  }
  function startTimeline(){
    if(!timelineStarted){
      initTimeline();timelineStarted=true;
    }
    document.body.classList.add('timeline-visible');
    $('tl').inert=false;$('tl').removeAttribute('aria-hidden');
  }
  function complete(){
    startTimeline();state='done';cancelAnimationFrame(frame);intro.hidden=true;intro.inert=true;
    document.body.classList.remove('intro-open');$('replay-intro').hidden=false;
    const next=$('next');if(next)next.focus({preventScroll:true});
  }
  function activate(){
    if(state!=='idle'||performance.now()<suppressClickUntil)return;if(reduce){intro.classList.add('finished');complete();return;}
    velocity={x:0,y:0};drag=null;intro.classList.remove('dragging');
    state='running';started=performance.now();frozenYaw=yaw;frozenPitch=pitch;
    const a=project(anchors[0],yaw,pitch);startCore={x:a.x-cx-pan.x,y:a.y-cy-pan.y};
    intro.classList.add('running');intro.setAttribute('aria-label','神经网络正在过渡到脑电时间线');
    [hit,leftHit,rightHit,$('enter-intro')].forEach(b=>b.disabled=true);
    // When replaying, return the preserved timeline camera to its first generation.
    window.dispatchEvent(new CustomEvent('weegoto:timeline-reset'));
  }
  [hit,leftHit,rightHit,$('enter-intro')].forEach(b=>b.addEventListener('click',activate));
  $('skip-intro').addEventListener('click',()=>{intro.classList.add('finished');complete();});
  $('replay-intro').addEventListener('click',()=>{
    $('tl').inert=true;$('tl').setAttribute('aria-hidden','true');
    document.body.classList.add('intro-open');document.body.classList.remove('timeline-visible');
    intro.hidden=false;intro.inert=false;intro.classList.remove('finished','running');intro.setAttribute('aria-label','神经节点交互开场');
    $('replay-intro').hidden=true;$('transition-copy').classList.remove('visible');$('transition-progress').style.width='0%';
    document.querySelectorAll('.step').forEach((el,i)=>el.classList.toggle('active',i===0));
    [hit,leftHit,rightHit,$('enter-intro')].forEach(b=>b.disabled=false);
    state='idle';epoch=performance.now();startCore={x:0,y:0};resetView();lastRender=0;
    window.dispatchEvent(new CustomEvent('weegoto:timeline-reset'));
    frame=requestAnimationFrame(render);$('enter-intro').focus({preventScroll:true});
  });
  function resetView(){yaw=-.20;pitch=0;pan={x:0,y:0};velocity={x:0,y:0};drag=null;suppressClickUntil=0;intro.classList.remove('dragging');}
  $('reset-view').addEventListener('click',resetView);
  document.querySelectorAll('[data-motion]').forEach(button=>button.addEventListener('click',()=>{
    motionMode=button.dataset.motion;velocity={x:0,y:0};
    document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    $('drag-hint').textContent=motionMode==='rotate'?'左键拖动旋转 · Shift + 左键平移 · 点击光点进入':'左键拖动移动 · 点击「旋转」切换 · 点击光点进入';
    intro.dataset.motion=motionMode;
  }));
  intro.addEventListener('pointerdown',e=>{
    if(state!=='idle'||e.button!==0)return;
    const target=e.target.closest('.cortex-hit')||(e.target===cv?cv:null);if(!target)return;
    velocity={x:0,y:0};
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,initialX:e.clientX,initialY:e.clientY,time:performance.now(),moved:false,mode:e.shiftKey?'pan':motionMode,target};
    target.setPointerCapture(e.pointerId);intro.classList.add('dragging');if(target===cv)e.preventDefault();
  });
  intro.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id||state!=='idle')return;
    const now=performance.now(),dx=e.clientX-drag.x,dy=e.clientY-drag.y,dt=Math.max(.008,(now-drag.time)/1000);
    if(Math.hypot(e.clientX-drag.initialX,e.clientY-drag.initialY)>4)drag.moved=true;
    if(drag.moved){
      if(drag.mode==='pan'){pan.x=clamp(pan.x+dx,-W*.42,W*.16);pan.y=clamp(pan.y+dy,-H*.25,H*.22);}
      else{yaw+=dx*.007;pitch=clamp(pitch+dy*.007,-1.48,1.48);velocity={x:clamp(dx*.007/dt,-2.6,2.6),y:clamp(dy*.007/dt,-2.6,2.6)};}
      suppressClickUntil=now+300;
    }
    drag.x=e.clientX;drag.y=e.clientY;drag.time=now;e.preventDefault();
  });
  function endDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    if(drag.moved)suppressClickUntil=performance.now()+250;
    if(!drag.moved||drag.mode==='pan'||reduce||performance.now()-drag.time>100)velocity={x:0,y:0};
    const target=drag.target;drag=null;intro.classList.remove('dragging');
    if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId);
  }
  intro.addEventListener('pointerup',endDrag);intro.addEventListener('pointercancel',e=>{velocity={x:0,y:0};endDrag(e)});
  intro.addEventListener('lostpointercapture',endDrag);
  window.addEventListener('blur',()=>{drag=null;velocity={x:0,y:0};intro.classList.remove('dragging');});
  cv.addEventListener('dblclick',resetView);
  // Block the timeline's document-level input handlers throughout the opening scene.
  for(const event of ['wheel','touchstart','touchend','keydown'])window.addEventListener(event,e=>{
    if(state==='done')return;
    if(event==='keydown'){
      if(e.target===cv&&state==='idle'){
        const map={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=map[e.key];
        if(direction){if(e.shiftKey){pan.x+=direction[0]*15;pan.y+=direction[1]*15;}else{yaw+=direction[0]*.12;pitch=clamp(pitch+direction[1]*.12,-1.48,1.48);}velocity={x:0,y:0};e.preventDefault();}
        if(e.key.toLowerCase()==='r')resetView();
      }
      if(e.key==='Escape'){$('skip-intro').click();e.preventDefault();}
      if(e.key==='Enter'||e.key===' '){if(e.target===document.body||e.target===cv){activate();e.preventDefault();}}
      e.stopImmediatePropagation();
    }else{if(event==='wheel')e.preventDefault();e.stopImmediatePropagation();}
  },{capture:true,passive:false});
  // Suspend the opening clock in background tabs instead of jumping past the animation.
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){pausedAt=performance.now();cancelAnimationFrame(frame);}
    else if(state!=='done'){if(pausedAt&&state==='running')started+=performance.now()-pausedAt;pausedAt=0;frame=requestAnimationFrame(render);}
  });
  $('tl').inert=true;$('tl').setAttribute('aria-hidden','true');
  const requestedGeneration=Number(new URLSearchParams(location.search).get('gen'));
  if(Number.isInteger(requestedGeneration)&&requestedGeneration>=1&&requestedGeneration<=8){complete();}
  else{frame=requestAnimationFrame(render);}
})();
