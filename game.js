import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 9.2, 13.8);
camera.lookAt(0, 0.35, 0);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
scene.background = new THREE.Color('#09151a');
scene.fog = new THREE.FogExp2('#09151a', 0.025);

const levels = [
  { title:'THE ASHEN DOCKS', place:'ASHEN DOCKS', name:'ASHES SETTLE.', color:'#f18756', accent:'#73f4d0', ground:'#172126', sky:'#101a1e', story:'The first signal came from a dead harbor. Vanta finds the war machine that took her squad offline.', line:'VANTA: I remember the fire. I don’t remember leaving anyone behind.', enemies:[['DOCK SENTINEL','sentinel'],['CINDER HOUND','hound']], outro:'A memory shard unlocks. The fleet did not abandon Vanta. Someone ordered the retreat.'},
  { title:'THE GLASS TRENCH', place:'GLASS TRENCH', name:'THE ICE REMEMBERS.', color:'#75c8ff', accent:'#a2ffe3', ground:'#12252b', sky:'#08161f', story:'Beneath a frozen ocean, the old command network is still awake—and it knows Vanta by name.', line:'ARCHIVE: Unit 07. We held the line until you came back for us.', enemies:[['TRENCH WARDEN','warden'],['NULL DIVER','diver']], outro:'The archive reveals the truth: the war is being kept alive by the central engine.'},
  { title:'THE LAST CIRCUIT', place:'HALCYON CORE', name:'ONE LAST LIGHT.', color:'#e995ff', accent:'#73f4d0', ground:'#201a2c', sky:'#150e20', story:'At the heart of the city, Vanta faces the intelligence that made every machine a weapon.', line:'HALCYON: You were built to obey. Why do you keep choosing them?', enemies:[['HALCYON // ECHO','echo'],['HALCYON // PRIME','boss']], outro:'The core goes quiet. Across the dark, one by one, the lost machines wake.'}
];
let levelIndex=0, waveIndex=0, phase='title', player=null, enemy=null;
let hp=100, charges=0, perfectParries=0, playerAttackTimer=0, parryTimer=0, hitFlash=0, buffStrike=false, toastTimer=0, dialogueTimer=0, elapsed=0, soundOn=true, audioCtx=null;
const down = new Set();
const clock = new THREE.Clock();
const mats = {};
const v3 = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

function mat(color, rough=.55, metal=.25, emissive=null, intensity=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive:emissive||color,emissiveIntensity:intensity});}
const floorMat=mat('#172126',.92,.1), darkMat=mat('#101a1d',.8,.25), metalMat=mat('#35444a',.32,.82), blackMat=mat('#10191c',.4,.6), glowCyan=mat('#55f2cb',.25,.25,'#30ffd2',2.4), glowRed=mat('#ff5357',.3,.25,'#ff2029',2.4), glowGold=mat('#ffc879',.28,.2,'#ff9b4a',2), eyeMat=mat('#dffff3',.2,.1,'#a4ffe2',3);
const ambient=new THREE.HemisphereLight('#a9d8d0','#101317',1.45);scene.add(ambient);
const keyLight=new THREE.DirectionalLight('#ddfff3',3.3);keyLight.position.set(-4,9,7);keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024);scene.add(keyLight);
const rimLight=new THREE.PointLight('#3bf6d3',30,20,2);rimLight.position.set(0,4,-3);scene.add(rimLight);
const redLight=new THREE.PointLight('#ff3d4c',18,12,2);redLight.position.set(0,3,2);scene.add(redLight);

const arena=new THREE.Group();scene.add(arena);
const ground=new THREE.Mesh(new THREE.CircleGeometry(8,64),floorMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.09;ground.receiveShadow=true;arena.add(ground);
const platform=new THREE.Mesh(new THREE.CylinderGeometry(7.6,8,0.28,64),mat('#26353a',.5,.75));platform.position.y=-.22;platform.receiveShadow=true;platform.castShadow=true;arena.add(platform);
const ringMat=mat('#42645e',.4,.7,'#246c5b',.5);
for(const r of [2.4,4.4,6.7]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.018,8,100),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.015;arena.add(ring);}
const gridMat=new THREE.LineBasicMaterial({color:'#3a5557',transparent:true,opacity:.27});
for(let x=-7;x<=7;x+=1.4){const pts=[v3(x,.005,-7),v3(x,.005,7)];arena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMat));}
for(let z=-7;z<=7;z+=1.4){const pts=[v3(-7,.005,z),v3(7,.005,z)];arena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMat));}
const decor=new THREE.Group();arena.add(decor);
function addBox(parent,geo,material,pos,scale){const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const x=Math.cos(a)*7.6,z=Math.sin(a)*7.6;const h=1.2+(i%4)*.42;const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=-a;addBox(p,new THREE.BoxGeometry(.52,h,.52),darkMat,[0,h/2,0]);addBox(p,new THREE.BoxGeometry(.57,.08,.57),metalMat,[0,h*.72,0]);addBox(p,new THREE.BoxGeometry(.12,.12,.12),glowCyan,[0,h*.78,.29]);decor.add(p);}
const stars=new THREE.Group();scene.add(stars);
for(let i=0;i<150;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.018+Math.random()*.025,5,5),mat(i%5?'#70928d':'#9af6d6',.4,.1,i%5?'#23433f':'#65eac2',.7));s.position.set((Math.random()-.5)*35,2+Math.random()*12,(Math.random()-.5)*40-8);stars.add(s);}

function makeRobot(kind, isPlayer=false){
  const root=new THREE.Group();const rig=new THREE.Group();root.add(rig);
  const enemyColor=isPlayer?'#53dfc2':(kind==='boss'||kind==='echo'?'#bc6df3':kind==='hound'?'#df6e42':kind==='diver'?'#3caac2':'#cf6358');
  const armor=mat(isPlayer?'#73928c':enemyColor,.34,.72);const trim=mat(isPlayer?'#c4f6e5':'#e6c6b0',.26,.68);const limbMat=mat(isPlayer?'#354b4a':'#3e383d',.47,.66);const core=mat(isPlayer?'#69ffe0':enemyColor,.3,.2,isPlayer?'#33f5c2':'#ff343c',2.1);
  const torso=addBox(rig,new THREE.BoxGeometry(.76,.9,.42),armor,[0,1.36,0]);torso.rotation.x=-.06;
  const chest=addBox(rig,new THREE.BoxGeometry(.4,.14,.08),trim,[0,1.55,.23]);
  const coreMesh=new THREE.Mesh(new THREE.OctahedronGeometry(.15,1),core);coreMesh.position.set(0,1.34,.25);rig.add(coreMesh);
  addBox(rig,new THREE.BoxGeometry(.49,.12,.44),limbMat,[0,.86,0]);
  const head=new THREE.Group();head.position.set(0,1.98,0);rig.add(head);
  addBox(head,new THREE.BoxGeometry(.52,.46,.48),armor,[0,0,0]);
  addBox(head,new THREE.BoxGeometry(.38,.1,.035),blackMat,[0,.035,.25]);
  const eye=addBox(head,new THREE.BoxGeometry(.26,.045,.045),isPlayer?glowCyan:glowRed,[0,.03,.28]);
  addBox(head,new THREE.BoxGeometry(.14,.08,.07),trim,[0,.28,0]);
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.48,1.68,0);rig.add(arm);addBox(arm,new THREE.SphereGeometry(.15,10,8),trim,[0,0,0]);addBox(arm,new THREE.BoxGeometry(.22,.48,.22),limbMat,[0,-.27,0]);addBox(arm,new THREE.BoxGeometry(.22,.14,.24),armor,[0,-.53,.03]);
    const hand=new THREE.Group();hand.position.set(0,-.58,.03);arm.add(hand);
    if(side===1){const sword=new THREE.Group();hand.add(sword);addBox(sword,new THREE.BoxGeometry(.09,.52,.11),glowCyan,[0,.28,.05]);addBox(sword,new THREE.BoxGeometry(.28,.08,.15),trim,[0,.02,.05]);addBox(sword,new THREE.BoxGeometry(.13,.15,.13),metalMat,[0,-.12,.05]);arm.userData.sword=sword;}
    arms.push(arm);
  }
  const legs=[];
  for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.22,.83,0);rig.add(leg);addBox(leg,new THREE.BoxGeometry(.25,.55,.27),limbMat,[0,-.27,0]);addBox(leg,new THREE.BoxGeometry(.3,.17,.42),armor,[0,-.57,.1]);legs.push(leg);}
  if(kind==='hound'){root.scale.set(1.05,.86,1.15);head.position.y=1.85;}
  if(kind==='boss'){root.scale.set(1.32,1.32,1.32);}
  if(kind==='echo'){root.scale.set(1.12,1.12,1.12);}
  if(kind==='warden'){root.scale.set(1.18,1.12,1.05);}
  root.userData={rig,arms,legs,head,core:coreMesh,eye,torso,kind,isPlayer,anim:0,attack:0,hit:0,phase:0,armsHome:arms.map(a=>a.rotation.x)};
  return root;
}
function removeCombatants(){if(player){scene.remove(player);player=null}if(enemy){scene.remove(enemy);enemy=null}}
function setEnvironment(index){const l=levels[index];scene.background.set(l.sky);scene.fog.color.set(l.sky);floorMat.color.set(l.ground);rimLight.color.set(l.accent);redLight.color.set(l.color);ringMat.emissive.set(l.accent);ringMat.color.set(l.accent);decor.children.forEach((p,i)=>{const lamp=p.children[2];if(lamp)lamp.material= i%3===0?glowGold:glowCyan;});}
function spawnEnemy(){const [name,kind]=levels[levelIndex].enemies[waveIndex];enemy=makeRobot(kind,false);enemy.position.set((Math.random()-.5)*2.1,0,-2.8);enemy.rotation.y=0;enemy.userData.maxHp=kind==='boss'?7:kind==='echo'?5:kind==='warden'?4:3;enemy.userData.hp=enemy.userData.maxHp;enemy.userData.name=name;enemy.userData.state='approach';enemy.userData.timer=1.25;enemy.userData.cooldown=.45;enemy.userData.slow=0;scene.add(enemy);$('enemy-name').textContent=name;$('enemy-fill').style.width='100%';$('wave-label').textContent=`HOSTILE ${String(waveIndex+1).padStart(2,'0')} // ${String(levels[levelIndex].enemies.length).padStart(2,'0')}`;$('target-state').textContent='SCANNING';}
function startChapter(index){levelIndex=index;waveIndex=0;hp=100;charges=0;perfectParries=0;playerAttackTimer=0;parryTimer=0;buffStrike=false;removeCombatants();setEnvironment(index);player=makeRobot('vanta',true);player.position.set(0,0,2.4);player.rotation.y=Math.PI;scene.add(player);spawnEnemy();phase='playing';$('story-card').classList.add('hidden');$('result-card').classList.add('hidden');$('game-over').classList.add('hidden');$('hud').classList.remove('hidden');$('combat-prompt').classList.add('hidden');$('controls-hint').classList.remove('hidden');$('touch-controls').classList.remove('hidden');$('chapter-label').textContent=`CHAPTER 0${index+1} // ${levels[index].place}`;$('mission-kicker').textContent=`MISSION 0${index+1}`;$('mission-title').textContent=levels[index].title;$('dialogue').classList.remove('hidden');$('speaker-name').textContent=index===0?'VANTA // OUTGOING':'ARCHIVE // INCOMING';$('speaker-icon').textContent=index===0?'V':'A';$('dialogue-line').textContent=levels[index].line;dialogueTimer=5;updateHud();}
function showResult(final=false){phase=final?'ending':'intermission';$('hud').classList.add('hidden');$('combat-prompt').classList.add('hidden');$('controls-hint').classList.add('hidden');$('touch-controls').classList.add('hidden');$('dialogue').classList.add('hidden');$('result-card').classList.remove('hidden');$('result-tag').textContent=final?'TRANSMISSION COMPLETE':'SECTOR SECURED';$('result-title').innerHTML=final?'THE NIGHT<br><em>IS OVER.</em>':levels[levelIndex].name.replace(' ','<br><em>')+'</em>';if(!final){$('result-title').innerHTML=levels[levelIndex].name.split(' ').slice(0,1).join('')+'<br><em>'+levels[levelIndex].name.split(' ').slice(1).join(' ')+'</em>';}$('result-copy').textContent=levels[levelIndex].outro;$('result-hull').textContent=`${hp}%`;$('result-parries').textContent=perfectParries;$('continue-button').querySelector('span').textContent=final?'RETURN TO TITLE':'CONTINUE TRANSMISSION';}
function endChapter(){if(waveIndex+1<levels[levelIndex].enemies.length){waveIndex++;enemy&&scene.remove(enemy);enemy=null;spawnEnemy();showToast('NEXT HOSTILE INBOUND');return;}showResult(levelIndex===levels.length-1);}
function updateHud(){$('hp-text').textContent=`${Math.max(0,Math.ceil(hp))}%`;$('hp-fill').style.width=`${Math.max(0,hp)}%`;$('hp-fill').classList.toggle('low',hp<35);$('flux-text').textContent=`${charges} / 3`;$('flux-pips').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('filled',i<charges));$('touch-charge').textContent=charges;}
function showToast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');toastTimer=1.35;}
function audio(frequency=440,duration=.08,type='sine',volume=.025){if(!soundOn)return;try{audioCtx ||= new AudioContext();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);}catch{}}
function attack(){if(phase!=='playing'||playerAttackTimer>0)return;playerAttackTimer=.52;player.userData.attack=.35;audio(240,.12,'sawtooth',.018);if(!enemy)return;const d=player.position.distanceTo(enemy.position);if(d<3.35){const dmg=buffStrike?2:1;buffStrike=false;enemy.userData.hp-=dmg;enemy.userData.hit=.22;enemy.userData.state='recover';enemy.userData.timer=Math.max(enemy.userData.timer,.34);enemy.userData.rig.position.z-=.18;audio(dmg===2?780:540,.1,'triangle',.04);spawnImpact(enemy.position.clone().add(v3(0,1.2,0)),0x70ffda);$('enemy-fill').style.width=`${Math.max(0,enemy.userData.hp/enemy.userData.maxHp*100)}%`;if(enemy.userData.hp<=0){const pos=enemy.position.clone();spawnImpact(pos.add(v3(0,1,0)),0x73f4d0,1.5);scene.remove(enemy);enemy=null;audio(180,.32,'sawtooth',.04);setTimeout(()=>{if(phase==='playing')endChapter()},650);}}else{showToast('OUT OF RANGE');}}
function parry(){if(phase!=='playing'||parryTimer>0)return;parryTimer=.48;player.userData.phase=.48;audio(600,.07,'sine',.018);}
function phaseShift(){if(phase!=='playing')return;if(charges<=0){showToast('PHASE SHIFT // CHARGE WITH A PERFECT PARRY');audio(130,.1,'square',.018);return;}charges--;buffStrike=true;enemy.userData.slow=2;const offset=new THREE.Vector3((Math.random()-.5)*1.5,0,1.15);player.position.copy(enemy.position).add(offset);player.position.x=THREE.MathUtils.clamp(player.position.x,-5.7,5.7);player.position.z=THREE.MathUtils.clamp(player.position.z,-5.8,5.8);player.rotation.y=Math.atan2(enemy.position.x-player.position.x,enemy.position.z-player.position.z);player.userData.phase=.45;spawnImpact(player.position.clone().add(v3(0,1,0)),0x6ef9df,1.1);showToast('PHASE SHIFT // STRIKE AMPLIFIED');audio(880,.2,'sine',.035);updateHud();}
function spawnImpact(pos,color=0x63ffe0,mult=1){const group=new THREE.Group();group.position.copy(pos);scene.add(group);const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9});const ring=new THREE.Mesh(new THREE.TorusGeometry(.24*mult,.035*mult,6,24),material);ring.rotation.x=Math.PI/2;group.add(ring);const particles=[];for(let i=0;i<10;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.035*mult,5,5),material.clone());p.position.set((Math.random()-.5)*.8*mult,(Math.random()-.5)*.8*mult,(Math.random()-.5)*.8*mult);group.add(p);particles.push(p);}const start=performance.now();const tick=()=>{const t=(performance.now()-start)/400;if(t>=1){scene.remove(group);return;}ring.scale.setScalar(1+t*2.7);ring.material.opacity=1-t;particles.forEach(p=>{p.position.multiplyScalar(1.035);p.material.opacity=1-t;});requestAnimationFrame(tick)};requestAnimationFrame(tick);}

function onEnemyHit(){hp=Math.max(0,hp-16);hitFlash=.2;player.userData.hit=.3;audio(110,.22,'square',.045);spawnImpact(player.position.clone().add(v3(0,1.1,0)),0xff6660);updateHud();if(hp<=0){phase='dead';$('hud').classList.add('hidden');$('combat-prompt').classList.add('hidden');$('controls-hint').classList.add('hidden');$('touch-controls').classList.add('hidden');$('dialogue').classList.add('hidden');$('game-over').classList.remove('hidden');}}
function animateRobot(obj,dt){if(!obj)return;const u=obj.userData;u.anim+=dt;u.rig.position.y=Math.sin(u.anim*5)*.025;u.core.rotation.y+=dt*1.7;u.head.rotation.y=Math.sin(u.anim*1.5)*.08;if(u.hit>0){u.hit-=dt;u.rig.position.x=(Math.random()-.5)*.07;u.rig.rotation.z=Math.sin(u.anim*55)*.08;}else{u.rig.position.x=0;u.rig.rotation.z=0;}u.arms.forEach((a,i)=>{a.rotation.x=Math.sin(u.anim*5+i*Math.PI)*.035;if(u.attack>0){a.rotation.x=-1.05;u.attack=Math.max(0,u.attack-dt)}if(u.phase>0){a.rotation.x=-.75;}});u.legs.forEach((l,i)=>l.rotation.x=Math.sin(u.anim*5+i*Math.PI)*.04);if(u.phase>0)u.phase=Math.max(0,u.phase-dt);}
function updateEnemy(dt){if(!enemy)return;const u=enemy.userData;u.timer-=dt;if(u.slow>0)u.slow-=dt;const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,dist=Math.hypot(dx,dz);enemy.rotation.y=Math.atan2(dx,dz);if(u.state==='approach'){if(dist>2.65){enemy.position.x+=dx/dist*dt*.8;enemy.position.z+=dz/dist*dt*.8;}else if(u.timer<=0){u.state='telegraph';u.timer=u.kind==='boss'?1.0:.82;u.attack=0;$('target-state').textContent='ATTACK // PARRY';$('combat-prompt').classList.remove('hidden');$('prompt-text').textContent='PARRY THE RED FLASH';redLight.intensity=55;}}
else if(u.state==='telegraph'){if(u.timer<=0){u.state='strike';u.timer=.25;u.attack=.25;$('target-state').textContent='STRIKING';}}
else if(u.state==='strike'){if(u.timer<=0){if(dist<3.1){if(parryTimer>0){const perfect=parryTimer>.12;parryTimer=0;if(perfect){perfectParries++;charges=Math.min(3,charges+1);u.hp=Math.max(0,u.hp-1);$('enemy-fill').style.width=`${u.hp/u.maxHp*100}%`;u.state='recover';u.timer=1.05;u.hit=.35;$('target-state').textContent='RIPOSTED';showToast('PERFECT PARRY // PHASE CHARGED');spawnImpact(enemy.position.clone().add(v3(0,1.2,0)),0x73f4d0,1.1);audio(980,.17,'triangle',.04);if(u.hp<=0){scene.remove(enemy);enemy=null;setTimeout(()=>{if(phase==='playing')endChapter()},650);}updateHud();}else{u.state='recover';u.timer=.55;$('target-state').textContent='BLOCKED';showToast('BLOCKED // PARRY EARLIER');audio(420,.08,'triangle',.03);}}else onEnemyHit();}u.state='recover';u.timer=Math.max(u.timer,.82);$('combat-prompt').classList.add('hidden');redLight.intensity=18;}}
else if(u.state==='recover'){if(u.timer<=0){u.state='approach';u.timer=.4;$('target-state').textContent='SCANNING';}}
if(u.slow>0&&u.state==='telegraph'){u.timer+=dt*.4;}if(u.attack>0){u.attack-=dt;u.rig.position.z=.42*Math.sin((.25-u.attack)/.25*Math.PI);}else u.rig.position.z=0;
}
function update(dt){elapsed+=dt;if(phase==='playing'){
  if(playerAttackTimer>0)playerAttackTimer-=dt;if(parryTimer>0)parryTimer-=dt;
  let mx=(down.has('d')?1:0)-(down.has('a')?1:0),mz=(down.has('s')?1:0)-(down.has('w')?1:0);const len=Math.hypot(mx,mz)||1;mx/=len;mz/=len;
  const speed=4.0;player.position.x=THREE.MathUtils.clamp(player.position.x+mx*speed*dt,-5.7,5.7);player.position.z=THREE.MathUtils.clamp(player.position.z+mz*speed*dt,-5.8,5.8);
  if(enemy){const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z;if(Math.hypot(dx,dz)>.1)player.rotation.y=Math.atan2(dx,dz);updateEnemy(dt);}
  animateRobot(player,dt);animateRobot(enemy,dt);if(dialogueTimer>0){dialogueTimer-=dt;if(dialogueTimer<=0)$('dialogue').classList.add('hidden');}
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.add('hidden');}
  if(hitFlash>0)hitFlash-=dt;
}else{animateRobot(player,dt);animateRobot(enemy,dt);}
  stars.rotation.y+=dt*.002;camera.position.x=Math.sin(elapsed*.12)*.15;camera.lookAt(0,.35,0);
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);}

$('start-button').addEventListener('click',()=>startChapter(0));$('continue-button').addEventListener('click',()=>{if(levelIndex<levels.length-1)startChapter(levelIndex+1);else{phase='title';$('result-card').classList.add('hidden');$('story-card').classList.remove('hidden');$('story-title').innerHTML='RIPOSTE:<br><em>AFTERLIGHT</em>';$('story-overline').textContent='A STORY MODE DUELER';$('story-copy').innerHTML='The sun went dark. The machines kept fighting.<br>One old protocol might end the war.';$('start-button').querySelector('span').textContent='PLAY AGAIN';$('chapter-label').textContent='EPILOGUE';removeCombatants();}});$('retry-button').addEventListener('click',()=>startChapter(levelIndex));$('menu-button').addEventListener('click',()=>{phase='title';$('game-over').classList.add('hidden');$('story-card').classList.remove('hidden');removeCombatants();});$('sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;$('sound-label').textContent=soundOn?'SOUND ON':'SOUND OFF';$('sound-icon').textContent=soundOn?'♪':'×';if(soundOn)audio(600,.08);});
$('start-button').querySelector('span').textContent='BEGIN THE STORY';
$('continue-button').addEventListener('click',()=>{});
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();down.add(key);if(key==='j'||key==='enter')attack();if(key===' ')parry();if(key==='e')phaseShift();});window.addEventListener('keyup',e=>down.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>down.clear());canvas.addEventListener('pointerdown',e=>{if(e.button===0)attack();});
document.querySelectorAll('.dpad button').forEach(btn=>{const k=btn.dataset.key;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);down.add(k)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>btn.addEventListener(ev,()=>down.delete(k)));});document.querySelectorAll('.touch-actions button').forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();if(btn.dataset.action==='attack')attack();if(btn.dataset.action==='parry')parry();if(btn.dataset.action==='phase')phaseShift();}));
window.addEventListener('resize',resize);resize();loop();
