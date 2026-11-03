/* ---- one device ---- */
const SZW=K.bookW, SZH=K.bookH, SZD=K.bookD;           // the slot a device stands in
const MM=K.bookH/147;                                   // world units per mm: a 3.5" drive fills the slot
const mPos=(i,scroll)=>{
  const k=i-(scroll||0);
  if(k>=0) return [0, K.mY + k*K.mStepY, K.mZ0 - k*K.mStepZ];
  return [0, K.mY + k*0.86, K.mZ0 - k*0.14];
};
const slotX=i=>(i-1.5)*K.slot;                   // four devices per shelf, centred
function bookBase(b){
  if(MOBILE) return mPos(b.index,0);
  return [slotX(b.data.slot), K.shelfTop[b.data.shelf]+(b.H/2)*Math.cos(b._lean), K.bookZ];
}
/* a landscape photo turns a quarter so the device stands on its end in the slot;
   the back turns the other way so it reads upright once the device is flipped */
function faceTex(img,land,cw){
  let src=img;
  if(land){
    src=C(img.height,img.width); const g=src.getContext('2d');
    g.translate(src.width/2,src.height/2); g.rotate(cw?Math.PI/2:-Math.PI/2);
    g.drawImage(img,-img.width/2,-img.height/2);
  }
  const t=new THREE.CanvasTexture(src);
  t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8;
  return t;
}
function edgeMaterial(col){
  return new THREE.ShaderMaterial({transparent:true,
    uniforms:{uCol:{value:new THREE.Color(col)},uOpacity:{value:0}},
    vertexShader:`varying vec3 vNw;
      void main(){ vNw=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uOpacity; varying vec3 vNw;
      void main(){
        vec3 N=normalize(vNw);
        vec3 L=normalize(vec3(0.52,0.70,0.55)), F=normalize(vec3(-0.35,-0.18,0.92));
        float shade=0.70+0.34*max(dot(N,L),0.0)+0.14*max(dot(N,F),0.0);
        gl_FragColor=vec4(uCol*shade,uOpacity);
        #include <colorspace_fragment>
      }`});
}

/* captions under the two drives of a comparison volume, placed where the
   camera puts each drive (the hand holds the pair at 0.45 across the view) */
function placeCaps(B,az){
  const el=document.getElementById('pair-cap');
  if(!B||!B.pair||MOBILE){ el.classList.remove('on'); return; }
  const tan=Math.tan(K.fov*Math.PI/360), d=camera.position.z-az, sx=d*tan*camera.aspect;
  const f=B.flipped?-1:1;                                 // a flip carries each drive to the other side
  el.style.setProperty('--a',(1.45+f*B.pair.xA/sx)*50+'%');
  el.style.setProperty('--b',(1.45+f*B.pair.xB/sx)*50+'%');
  el.style.setProperty('--y',(1+B.ah*0.5/(d*tan))*50+'%');
  document.getElementById('cap-a').innerHTML=B.data.caps[0];
  document.getElementById('cap-b').innerHTML=B.data.caps[1];
  el.classList.add('on');
}

function buildBook(data,index){
  const rnd=mulberry(index*7919+13);
  const dev=data.dev, pl=PLATE[data.id];
  const B={data,index,flipped:false,land:!!dev.land};
  // real size: the long side is dev.mm, the short side follows the photo
  const k=MM*(dev.boost||1), long=dev.mm*k;
  const aspect=pl.front.height/pl.front.width;           // short / long for a landscape photo
  B.W=B.land? long*aspect : long/aspect;
  B.H=long;
  B.D=dev.d*k;
  B.activeRot=[K.activeRot[0],K.activeRot[1],B.land?-Math.PI/2:0];
  B._lean=K.lean+(rnd()-0.5)*0.075;
  B._yaw = K.yaw+(rnd()-0.5)*0.045;
  B._roll=(rnd()-0.5)*0.018;
  B.rest=[B._lean,B._yaw,B._roll];
  B.restTilt=MOBILE?K.mTilt:B._lean;
  B.base=[0,0,0.01];
  B.basePos=bookBase(B);
  const W=B.W, H=B.H, D=B.D;

  const gRoot=new THREE.Group(); gRoot.position.set(...B.basePos);
  const gHover=new THREE.Group(); gHover.position.set(...B.base);
  const gWob=new THREE.Group();
  const gTilt=new THREE.Group(); gTilt.rotation.set(...(MOBILE?[K.mTilt,0,0]:B.rest));
  const gScl=new THREE.Group(); gScl.scale.setScalar(0);
  gRoot.add(gHover); gHover.add(gWob); gWob.add(gTilt); gTilt.add(gScl);
  scene.add(gRoot);

  const clothMat=new THREE.MeshBasicMaterial({visible:false});   // the photos are the faces
  // the board shader with the bow and chamfer flattened: the photo carries the relief
  const mk=(tex,satin,seed,w,h)=>new THREE.ShaderMaterial({transparent:true,
    uniforms:{uTex:{value:tex},uSatin:{value:satin},uOpacity:{value:0},uSeed:{value:seed},
              uBow:{value:0},uChamf:{value:0},uER:{value:K.chamfR},
              uW:{value:w},uH:{value:h}},
    vertexShader:COVER_VS,fragmentShader:COVER_FS});
  // one physical device: a core block between its two photographs
  function device(front,backImg,w,h,d,land,o){
    const g=new THREE.Group(), edge=edgeMaterial(o.edge);
    // the core sits inside the cut-out, so its edges never show past a ragged outline
    const [ix,iy]=o.inset||[0.97,0.985];
    const sd=o.twin?clothMat:edge;                       // a kit has air between its sticks: no solid core
    const body=new THREE.Mesh(new THREE.BoxGeometry(w*ix,h*iy,d),[sd,sd,sd,sd,clothMat,clothMat]);
    const geo=new THREE.PlaneGeometry(w,h), coverTex=faceTex(front,land,false);
    const coverMat=mk(coverTex,0.8,index*7.3,w,h), backMat=mk(faceTex(backImg,land,true),0.6,index*3.1+11,w,h);
    const cover=new THREE.Mesh(geo,coverMat); cover.position.z=d/2+0.0008;
    const back=new THREE.Mesh(geo,backMat); back.position.z=-d/2-0.0008; back.rotation.y=Math.PI;
    g.add(body,cover,back);
    return {g,body,cover,back,coverMat,backMat,edge,coverTex};
  }
  const A=device(pl.front,pl.back,W,H,D,B.land,dev);
  gScl.add(A.g);
  const {body,cover,back,coverMat,backMat,edge,coverTex}=A;
  B.bodies=[body];
  B.loadBack=()=>{};
  // a comparison volume carries a second device that slides out beside the first once in the hand
  if(dev.pair){
    const p=dev.pair, pp=PLATE[data.id+'+'], pk=MM*(p.boost||1);
    const pw=p.mm*pk, ph=pw*pp.front.height/pp.front.width;      // shown as photographed, landscape
    const P=device(pp.front,pp.back,pw,ph,p.d*pk,false,p);
    P.g.scale.setScalar(0); gScl.add(P.g);
    const gap=0.16, tot=W+gap+pw;
    B.pair={g:P.g,xA:-tot/2+W/2,xB:tot/2-pw/2,mats:[P.coverMat,P.backMat,P.edge]};
    B.devA=A.g; B.aw=tot; B.ah=Math.max(H,ph); B.tPair=new Tw([0]);
    B.bodies.push(P.body);
    B.activeRot=[K.activeRot[0],0.12,0];                  // nearly square-on, so neither drive hides the other
  }

  const hit=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(W*1.06,0.62),H*0.98),
    new THREE.MeshBasicMaterial({visible:false}));
  hit.position.set(B.basePos[0],B.basePos[1],B.basePos[2]-0.04);
  hit.rotation.x=MOBILE?K.mTilt:B._lean;
  hit.rotation.y=MOBILE?0:B._yaw;
  hit.userData.book=B;
  scene.add(hit);

  const wallSh=new THREE.Mesh(new THREE.PlaneGeometry(2.20*(W+0.25)/(SZW+0.25),2.70*H/SZH),
    new THREE.MeshBasicMaterial({map:SHADOW_TEX,transparent:true,opacity:0,depthWrite:false,color:0x241c12}));
  wallSh.position.set(B.basePos[0]-0.05,B.basePos[1]-0.04,K.wallZ+0.004);
  scene.add(wallSh);

  const footZ=K.bookZ+(H/2)*Math.sin(-B._lean);             // where the device meets the plank
  const csBack=footZ-D*0.5-0.045;
  const csFront=K.wallZ+K.plankDepth-0.035;
  const csDepth=csFront-csBack;
  const cs=new THREE.Mesh(new THREE.PlaneGeometry(W*1.42+0.08,csDepth),
    new THREE.MeshBasicMaterial({map:CONTACT_TEX,transparent:true,opacity:0,depthWrite:false,color:0x241a10}));
  cs.rotation.x=-Math.PI/2;
  cs.position.set(B.basePos[0],K.shelfTop[data.shelf]+0.0022,csBack+csDepth*0.5);
  scene.add(cs);
  const crease=new THREE.Mesh(new THREE.PlaneGeometry(W*1.16,0.075),
    new THREE.MeshBasicMaterial({map:CREASE_TEX,color:0x1a1208,transparent:true,opacity:0,depthWrite:false}));
  crease.position.set(B.basePos[0],K.shelfTop[data.shelf]+0.030,footZ+D*0.5+0.004);
  scene.add(crease);

  const reflMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{uTex:{value:coverTex},uOpacity:{value:0}},
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      uniform sampler2D uTex; uniform float uOpacity; varying vec2 vUv;
      float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
        p3+=dot(p3,p3.yxz+33.33);return fract((p3.x+p3.y)*p3.z);}
      void main(){
        float mappedY=mix(0.0,0.22,1.0-vUv.y);
        float edge=min(min(smoothstep(0.0,0.06,vUv.y),smoothstep(0.0,0.12,1.0-vUv.y)),
                       min(smoothstep(0.0,0.06,vUv.x),smoothstep(0.0,0.06,1.0-vUv.x)));
        float b=0.004+0.02*(1.0-edge);
        vec4 col=(texture2D(uTex,vec2(vUv.x+b,mappedY))+texture2D(uTex,vec2(vUv.x-b,mappedY))
                 +texture2D(uTex,vec2(vUv.x,mappedY+b*0.5))+texture2D(uTex,vec2(vUv.x,mappedY-b*0.5)))*0.25;
        float fade=vUv.y*vUv.y*1.7;
        float sp=hash(vUv*220.0);
        gl_FragColor=vec4(col.rgb,uOpacity*fade*(1.0-sp*0.34)*edge*col.a);
        #include <colorspace_fragment>
      }`});
  const refl=new THREE.Mesh(new THREE.PlaneGeometry(W,0.60*H/SZH),reflMat);
  refl.rotation.x=-Math.PI/2;
  refl.position.set(B.basePos[0],K.shelfTop[data.shelf]+0.0012,footZ+0.24);
  scene.add(refl);

  Object.assign(B,{gRoot,gHover,gWob,gTilt,gScl,body,cover,back,coverMat,backMat,spineMat:edge,
    clothMat,pages:edge,hit,wallSh,cs,crease,refl,reflMat,
    tHover:new Tw([...B.base]), tTilt:new Tw(MOBILE?[K.mTilt,0,0]:[...B.rest]),
    sWob:new Spring([0,0,0],80,6,1),
    tActiveP:new Tw([...B.basePos]), tActiveR:new Tw([0,0,0]),
    tScale:new Tw([0]), tRefl:new Tw([0.34]), tFade:new Tw([0]), tSeat:new Tw([1])});
  if(MOBILE){wallSh.visible=false;cs.visible=false;crease.visible=false;refl.visible=false;
             gRoot.renderOrder=100-index;}
  return B;
}
