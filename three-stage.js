const canvas=document.querySelector('#stage-canvas'),stage=document.querySelector('#stage');
const fallback=document.querySelector('#stage-fallback'),label=document.querySelector('#model-state');
function failed(e){console.warn('KITTI 3D unavailable:',e);canvas.hidden=true;fallback.hidden=false;document.querySelector('#fallback-note').textContent='3D ไม่พร้อมใช้งาน — ยังเลือกสีและสั่งซื้อได้';label.textContent='IMAGE PREVIEW MODE'}
async function main(){
 const THREE=await import('three');
 const [{GLTFLoader},{MeshoptDecoder}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js')]);
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:window.innerWidth>=650,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,window.innerWidth<650?1.1:1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,100);scene.add(new THREE.HemisphereLight(0xffffff,0x776d64,2.8));
 const key=new THREE.DirectionalLight(0xffffff,2.9);key.position.set(-3,6,8);scene.add(key);const fill=new THREE.DirectionalLight(0xffeee3,1.3);fill.position.set(5,2,-3);scene.add(fill);
 const metal=new THREE.MeshStandardMaterial({color:0xaaaaaa,metalness:.84,roughness:.25}),wood=new THREE.MeshStandardMaterial({color:0x6f635b,metalness:.22,roughness:.53});
 function rod(parent,a,b,r,mat){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),d=bb.clone().sub(aa);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),12),mat);mesh.position.copy(aa).add(bb).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(mesh)}
 const rack=new THREE.Group();scene.add(rack);rod(rack,[-6.6,1.97,-.7],[6.6,1.97,-.7],.035,metal);
 for(const x of [-6,6])rod(rack,[x,-1.7,-.7],[x,1.97,-.7],.027,metal);
 function hanger(){const group=new THREE.Group();for(const [a,b,r,mat] of [[[-.53,1.41,0],[0,1.64,0],.019,wood],[[0,1.64,0],[.53,1.41,0],.019,wood],[[-.53,1.41,0],[.53,1.41,0],.012,wood],[[0,1.64,0],[0,1.81,0],.012,metal],[[0,1.81,0],[.13,1.86,0],.012,metal]])rod(group,a,b,r,mat);return group}
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const model=await new Promise((resolve,reject)=>loader.load(window.KITTI_CONFIG.MODEL_GLB,resolve,ev=>{if(ev.total)label.textContent='LOADING 3D / '+Math.round(100*ev.loaded/ev.total)+'%'},reject));
 const textureLoader=new THREE.TextureLoader();const textures={};for(const [c,url] of [['WHITE','assets/texture-white.jpg'],['BLACK','assets/texture-black.jpg']])textures[c]=await new Promise((res,rej)=>textureLoader.load(url,res,undefined,rej));
 for(const tex of Object.values(textures)){tex.flipY=false;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())}
 // GLB axes: x=depth, y=width, z=height; rotate into normal web scene axes.
 const orientMatrix=new THREE.Matrix4().set(0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,1),orientation=new THREE.Quaternion().setFromRotationMatrix(orientMatrix);
 const shirts=[],colors=['BEIGE','WHITE','BLACK'];
 colors.forEach((color,i)=>{
  const pivot=new THREE.Group();pivot.userData.shirtColor=color;pivot.position.x=(i-1)*2.13;scene.add(pivot);pivot.add(hanger());
  const mesh=model.scene.clone(true);mesh.traverse(obj=>{if(obj.isMesh){obj.frustumCulled=false;const mat=obj.material.clone();mat.side=THREE.DoubleSide;if(textures[color])mat.map=textures[color];mat.roughness=.82;mat.metalness=0;mat.needsUpdate=true;obj.material=mat}});
  const aligned=new THREE.Group();aligned.quaternion.copy(orientation);aligned.add(mesh);pivot.add(aligned);aligned.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(aligned),size=box.getSize(new THREE.Vector3());aligned.scale.setScalar(2.5/Math.max(size.y,.01));aligned.updateMatrixWorld(true);box.setFromObject(aligned);const center=box.getCenter(new THREE.Vector3());aligned.position.sub(center);aligned.position.y-=.17;shirts.push({pivot,color,x:(i-1)*2.13});
 });
 function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=window.innerWidth<600?38:32;camera.position.set(0,.55,window.innerWidth<600?10.9:8.8);camera.lookAt(0,0,0);camera.updateProjectionMatrix()};resize();window.addEventListener('resize',resize);if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);
 fallback.style.display='none';label.textContent='3D LIVE / DRAG TO ROTATE';let selected='BEIGE',yaw=0,pointer=null,dragged=false;
 function choose(color,emit){selected=color;yaw=0;if(emit)document.dispatchEvent(new CustomEvent('kitti:from3d',{detail:{color}}))}
 document.addEventListener('kitti:select',e=>{if(e.detail?.color)choose(e.detail.color,false)});document.addEventListener('kitti:reset',()=>yaw=0);
 function pick(e){const b=canvas.getBoundingClientRect(),pos=new THREE.Vector2(((e.clientX-b.left)/b.width)*2-1,-((e.clientY-b.top)/b.height)*2+1),ray=new THREE.Raycaster();ray.setFromCamera(pos,camera);const hits=ray.intersectObjects(shirts.map(s=>s.pivot),true);for(const h of hits){let obj=h.object;while(obj){if(obj.userData.shirtColor)return obj.userData.shirtColor;obj=obj.parent}}return null}
 canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};dragged=false;try{canvas.setPointerCapture(e.pointerId)}catch(_){}});
 canvas.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>4)dragged=true;if(dragged){yaw+=dx*.012;pointer={x:e.clientX,y:e.clientY};if(e.pointerType==='touch')e.preventDefault()}},{passive:false});
 canvas.addEventListener('pointerup',e=>{if(pointer&&!dragged){const color=pick(e);if(color)choose(color,true)}pointer=null;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}});
 canvas.addEventListener('pointercancel',()=>{pointer=null});canvas.addEventListener('dblclick',()=>yaw=0);
 const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();for(const s of shirts){const active=s.color===selected;const targetX=s.x*(active?.85:1);s.pivot.position.x=THREE.MathUtils.lerp(s.pivot.position.x,targetX,.09);s.pivot.position.z=THREE.MathUtils.lerp(s.pivot.position.z,active?1.15:-.15,.09);s.pivot.position.y=THREE.MathUtils.lerp(s.pivot.position.y,active?.07:0,.09);const scale=THREE.MathUtils.lerp(s.pivot.scale.x,active?1.16:.92,.08);s.pivot.scale.setScalar(scale);s.pivot.rotation.y=THREE.MathUtils.lerp(s.pivot.rotation.y,active?yaw:Math.sin(t+s.x)*.035,.13);s.pivot.rotation.z=Math.sin(t*.8+s.x)*.004;}renderer.render(scene,camera)}animate();
}
main().catch(failed);
