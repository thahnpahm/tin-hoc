/* The devices are real photographs from Wikimedia Commons (credited per volume),
   cut out and inlined as data URIs so the page stays one file and the canvas
   never taints under file://. */
/*ASSETS*/
const MARK_SRC = {};              // id -> footer thumbnail
const PLATE = {};                 // id -> {front, back} canvases, upright as photographed
for(const b of BOOKS) MARK_SRC[b.id]=ASSET[b.dev.f];
const loadImg=src=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src;});
function twin(im){                                // two sticks of a dual-channel kit, one above the other
  const gap=Math.round(im.height*.35), c=C(im.width,im.height*2+gap), g=c.getContext('2d');
  g.drawImage(im,0,0); g.drawImage(im,0,im.height+gap); return c;
}
function backOf(front,mode,col){                  // for photos that only show one side
  const c=C(front.width,front.height), g=c.getContext('2d');
  g.translate(c.width,0); g.scale(-1,1); g.drawImage(front,0,0); g.setTransform(1,0,0,1,0,0);
  g.globalCompositeOperation='source-atop';
  if(mode==='mirror'){ g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(0,0,c.width,c.height); return c; }
  g.fillStyle=col; g.fillRect(0,0,c.width,c.height);
  g.fillStyle=lg(g,0,0,0,c.height,[[0,'rgba(255,255,255,.16)'],[.5,'rgba(255,255,255,0)'],[1,'rgba(0,0,0,.25)']]);
  g.fillRect(0,0,c.width,c.height);
  const r=mulberry(c.width);                      // brushed finish
  for(let i=0;i<900;i++){g.fillStyle=r()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.06)';
    g.fillRect(r()*c.width,r()*c.height,c.width*(.05+r()*.2),1);}
  return c;
}
async function loadPlates(){
  const im={};                                    // every photo at once: on the web they are separate files
  await Promise.all(Object.keys(ASSET).map(async k=>{ im[k]=await loadImg(ASSET[k]); }));
  for(const b of BOOKS){
    const d=b.dev;
    let front=im[d.f];
    if(d.twin) front=twin(front);
    const back=d.b ? im[d.b] : backOf(front,d.backMode,d.backCol);
    PLATE[b.id]={front,back};
    if(d.pair) PLATE[b.id+'+']={front:im[d.pair.f],back:im[d.pair.b]};
  }
}
