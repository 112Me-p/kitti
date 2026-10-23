/* KITTI showroom, Draft 02.
   The supplied GLB is retained as a reference in the previous draft. It rendered as
   disconnected/sideways pieces, so the live showroom uses a consistent, volumetric
   custom T-shirt geometry with prints extracted from the six supplied product photos.
   No bitmap billboard is presented as a 3D garment. */
const canvas = document.getElementById('stage-canvas');
const stage = document.getElementById('stage');
const fallback = document.getElementById('stage-fallback');
const stateText = document.getElementById('model-state');
function useFallback(error) {
  console.warn('KITTI 3D viewer fallback:', error);
  canvas.hidden = true;
  fallback.hidden = false;
  fallback.style.display = '';
  document.getElementById('fallback-note').textContent = 'โหมดรูปภาพ — เลือกสีและสั่งซื้อได้ตามปกติ';
  stateText.textContent = 'IMAGE MODE / 3D UNAVAILABLE';
}

async function runViewer() {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, window.innerWidth<700?1.45:1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30,1,.1,60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a7e, 2.2));
  const key = new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-3,7,7);scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe5d1,1.5);fill.position.set(5,3,1);scene.add(fill);
  const backLight = new THREE.DirectionalLight(0xffffff,1.3);backLight.position.set(0,4,-6);scene.add(backLight);
  const wood = new THREE.MeshStandardMaterial({color:0x7b6755,roughness:.55,metalness:.05});
  const steel = new THREE.MeshStandardMaterial({color:0x999795,roughness:.32,metalness:.73});
  const colors = ['BEIGE','WHITE','BLACK'];
  const fabricColors={BEIGE:0xd5c8b1,WHITE:0xf0efeb,BLACK:0x242527};

  function rod(parent,a,b,r,material,segments=10) {
    const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b);
    const delta=bb.clone().sub(aa);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),segments),material);
    mesh.position.copy(aa).add(bb).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    parent.add(mesh);return mesh;
  }
  const rack=new THREE.Group();scene.add(rack);
  rod(rack,[-4.13,1.82,-.64],[4.13,1.82,-.64],.028,steel,14);
  for(const x of [-4.02,4.02]) {
    rod(rack,[x,-1.50,-.64],[x,1.82,-.64],.024,steel);
    rod(rack,[x-.26,-1.53,-.64],[x+.26,-1.53,-.64],.023,steel);
  }
  const floorShadowMaterial = new THREE.MeshBasicMaterial({color:0x665b50,transparent:true,opacity:.035,depthWrite:false});
  const floorLine = new THREE.Mesh(new THREE.PlaneGeometry(8.8,.02), floorShadowMaterial);
  floorLine.position.set(0,-1.55,-.61);rack.add(floorLine);

  function curveStroke(parent, coords, material, thickness=.012) {
    const curve = new THREE.CatmullRomCurve3(coords.map(p=>new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(14,coords.length*5),thickness,6,false), material);
    parent.add(mesh);return mesh;
  }
  function buildHanger(parent) {
    const hanger = new THREE.Group();parent.add(hanger);
    // The hook is near the rail; shoulders are immediately under the shirt neckline.
    curveStroke(hanger,[[0,1.45,-.42],[.005,1.56,-.42],[.09,1.62,-.42],[.115,1.74,-.42],[.015,1.80,-.42],[-.07,1.75,-.42]],steel,.014);
    rod(hanger,[-.61,1.00,-.34],[0,1.48,-.34],.025,wood);
    rod(hanger,[0,1.48,-.34],[.61,1.00,-.34],.025,wood);
    rod(hanger,[-.61,1.00,-.34],[.61,1.00,-.34],.010,wood);
    return hanger;
  }

  function widthAtY(y){return .56 + .025*Math.max(0,(.6-y)/1.8);}
  function fabricDepth(x,y,isFront) {
    const w=widthAtY(y);
    const bulge=(1-Math.pow(x/Math.max(w,.1),2));
    const fold=.012*Math.sin(10*y+6*x)+.008*Math.cos(13*y-9*x);
    return isFront ? .125 + .085*bulge + fold : -.125-.055*bulge+fold*.65;
  }
  function materialColor(hex) {
    return new THREE.MeshStandardMaterial({color:hex,side:THREE.DoubleSide,roughness:.94,metalness:0});
  }
  function torsoPanel(front,mat) {
    const nx=32,ny=42,vertices=[],uvs=[],indices=[];
    for(let j=0;j<=ny;j++) {
      const v=j/ny,y=.96-v*2.03,w=widthAtY(y);
      for(let i=0;i<=nx;i++) {
        const u=i/nx,x=(u*2-1)*w;
        vertices.push(x,y,fabricDepth(x,y,front));uvs.push(u,1-v);
      }
    }
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
      if(front)indices.push(a,c,b,b,c,d);
      else indices.push(a,b,c,b,d,c);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    return new THREE.Mesh(geometry,mat);
  }
  function sleeve(parent,side,mat){
    const s=side;
    const points=[[s*.53,.93],[s*.64,.95],[s*1.03,.51],[s*.92,.16],[s*.61,.23],[s*.57,.39]];
    const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);
    points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.235,bevelEnabled:true,bevelSegments:2,steps:1,bevelThickness:.018,bevelSize:.018,curveSegments:8});
    geo.translate(0,0,-.14);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);parent.add(mesh);
    // Thin hem seam across the sleeve opening.
    const seam=new THREE.MeshStandardMaterial({color:mat.color,roughness:.98});
    curveStroke(parent,[[s*.923,.172,.12],[s*.968,.34,.15],[s*1.023,.51,.12]],seam,.009);
  }
  function graphicMesh(tex,front){
    const nx=16,ny=22,verts=[],uvs=[],indices=[];
    const width=front?.76:.85,top=front?.72:.72,height=front?1.05:1.03;
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
      const u=i/nx,v=j/ny;
      const x=(u-.5)*width*(front?1:-1);
      const y=top-v*height;
      const z=fabricDepth(x,y,front)+(front?.018:-.018);
      verts.push(x,y,z);uvs.push(u,1-v);
    }
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
      indices.push(a,c,b,b,c,d);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
    return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.05,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  }
  function neck(parent,color){
    const collarMat=new THREE.MeshStandardMaterial({color:color==='BLACK'?0x171819:color==='WHITE'?0xd4d3ce:0xb8a98f,roughness:.9,side:THREE.DoubleSide});
    const dark=new THREE.MeshBasicMaterial({color:color==='BLACK'?0x1b1b1b:0x908a7f,side:THREE.DoubleSide});
    const hole=new THREE.Mesh(new THREE.CircleGeometry(.154,40),dark);
    hole.scale.y=.36;hole.position.set(0,.963,.216);parent.add(hole);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.168,.026,6,40),collarMat);ring.scale.y=.39;ring.position.set(0,.96,.225);parent.add(ring);
    const seamMat=new THREE.MeshBasicMaterial({color:color==='BLACK'?0x464647:color==='WHITE'?0xe0dfdc:0xc8bba5,transparent:true,opacity:.8});
    const hemPoints=[];for(let i=0;i<=12;i++){const x=(i/12*2-1)*widthAtY(-1.03);hemPoints.push([x,-1.01,fabricDepth(x,-1.01,true)+.007]);}
    curveStroke(parent,hemPoints,seamMat,.006);
  }

  const printTextures={};
  const loader=new THREE.TextureLoader();
  const sources=colors.flatMap(c=>['front','back'].map(face=>({key:c+'-'+face,url:'assets/print-'+c.toLowerCase()+'-'+face+'.png'})));
  let received=0;
  await Promise.all(sources.map(async source=>{
    printTextures[source.key]=await new Promise((resolve,reject)=>loader.load(source.url,resolve,undefined,reject));
    const t=printTextures[source.key];t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    stateText.textContent='LOADING ARTWORK / '+(++received)+' OF '+sources.length;
  }));
  const shirts=[];
  colors.forEach((color,index)=>{
    const pivot=new THREE.Group();pivot.position.set((index-1)*2.54,0,0);pivot.userData.shirtColor=color;scene.add(pivot);
    const fabric=materialColor(fabricColors[color]);
    buildHanger(pivot);
    pivot.add(torsoPanel(true,fabric));pivot.add(torsoPanel(false,fabric));
    sleeve(pivot,-1,fabric);sleeve(pivot,1,fabric);
    neck(pivot,color);
    pivot.add(graphicMesh(printTextures[color+'-front'],true));
    pivot.add(graphicMesh(printTextures[color+'-back'],false));
    // close the bottom with softly visible fabric, so a side rotation is volumetric.
    const bottom=new THREE.Mesh(new THREE.BoxGeometry(1.16,.017,.275),fabric);
    bottom.position.set(0,-1.063,0);pivot.add(bottom);
    shirts.push({color,pivot,x:(index-1)*2.54});
  });

  let selected='BEIGE',yaw=0,tracking=null,dragged=false;
  function choose(c,notify){if(!colors.includes(c))return;selected=c;yaw=0;if(notify)document.dispatchEvent(new CustomEvent('kitti:from3d',{detail:{color:c}}));}
  document.addEventListener('kitti:select',ev=>{if(ev.detail?.color)choose(ev.detail.color,false)});
  document.addEventListener('kitti:reset',()=>{yaw=0});
  function resize(){
    const r=stage.getBoundingClientRect(),isMobile=r.width<600;
    const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=isMobile?42:29;
    camera.userData.mobile=isMobile;
    camera.userData.dist=isMobile?5.65:8.8;
    camera.position.set(0,.12,camera.userData.dist);
    camera.lookAt(0,.1,0);camera.updateProjectionMatrix();
  }
  resize();window.addEventListener('resize',resize,{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);
  fallback.hidden=true;fallback.style.display='none';stateText.textContent='3D LIVE / SELECT A SHIRT · DRAG TO TURN';
  function rayPick(ev){
    const rect=canvas.getBoundingClientRect(),xy=new THREE.Vector2((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1);
    const ray=new THREE.Raycaster();ray.setFromCamera(xy,camera);
    const hits=ray.intersectObjects(shirts.map(s=>s.pivot),true);
    for(const h of hits){let obj=h.object;while(obj){if(obj.userData?.shirtColor)return obj.userData.shirtColor;obj=obj.parent;}}
    return null;
  }
  canvas.style.touchAction='pan-y';
  canvas.style.cursor='grab';
  canvas.addEventListener('pointerdown',e=>{tracking={startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY};dragged=false;canvas.style.cursor='grabbing';canvas.setPointerCapture?.(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{
    if(!tracking)return;
    if(Math.abs(e.clientX-tracking.startX)+Math.abs(e.clientY-tracking.startY)>5)dragged=true;
    if(dragged){
      const dx=e.clientX-tracking.x;
      yaw+=dx*.013;
      tracking.x=e.clientX;tracking.y=e.clientY;
      if(e.pointerType==='touch')e.preventDefault();
    }
  },{passive:false});
  canvas.addEventListener('pointerup',e=>{
    if(tracking&&!dragged){const c=rayPick(e);if(c)choose(c,true)}
    tracking=null;canvas.style.cursor='grab';try{canvas.releasePointerCapture(e.pointerId)}catch(_){ }
  });
  canvas.addEventListener('pointercancel',()=>{tracking=null;canvas.style.cursor='grab'});
  canvas.addEventListener('dblclick',()=>yaw=0);
  // Allow vertical page scroll while one finger is moving primarily up/down.
  let lastTime=0;
  function animate(now){
    requestAnimationFrame(animate);
    const t=now*.001,delta=Math.min((now-lastTime)/1000,.04);lastTime=now;
    for(const shirt of shirts){
      const active=shirt.color===selected;
      const destX=shirt.x*(active?.95:1);
      shirt.pivot.position.x=THREE.MathUtils.lerp(shirt.pivot.position.x,destX,.1);
      shirt.pivot.position.z=THREE.MathUtils.lerp(shirt.pivot.position.z,active?.56:-.13,.1);
      shirt.pivot.position.y=THREE.MathUtils.lerp(shirt.pivot.position.y,active?-.015:0,.1);
      const sc=THREE.MathUtils.lerp(shirt.pivot.scale.x,active?1.08:1,.1);
      shirt.pivot.scale.setScalar(sc);
      shirt.pivot.rotation.y=THREE.MathUtils.lerp(shirt.pivot.rotation.y,active?yaw:Math.sin(t*.5+shirt.x)*.026,.13);
      shirt.pivot.rotation.z=Math.sin(t*.82+shirt.x)*.007;
    }
    const focused=shirts.find(s=>s.color===selected);
    const targetX=camera.userData.mobile?focused.pivot.position.x:.0;
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,targetX*.88,.07);
    camera.lookAt(camera.position.x,.06,0);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
}
runViewer().catch(useFallback);
