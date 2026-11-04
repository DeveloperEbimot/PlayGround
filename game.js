import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const MAP = [
    '####################','#........#.........#','#........#.........#','#..................#','#..##......##......#','#..##..............#','#..................#','#.....####.........#','#.....#..#.........#','#.....#..#.........#','#..................#','#..........##......#','#..................#','####################'
  ];
  const MAP_W = MAP[0].length, MAP_H = MAP.length, TILE = 3.2, WORLD_W = MAP_W * TILE, WORLD_D = MAP_H * TILE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202b2a');
  scene.fog = new THREE.FogExp2('#202b2a', 0.012);
  const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.08, 100);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  scene.add(new THREE.HemisphereLight('#a9c2b9', '#24211b', 1.35));
  const sun = new THREE.DirectionalLight('#f0c99a', 2.2);
  sun.position.set(-16, 24, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -34; sun.shadow.camera.right = 34; sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28;
  scene.add(sun);
  const warm = new THREE.PointLight('#d27642', 18, 30, 2); warm.position.set(17, 7, -13); scene.add(warm);

  const mat = (color, roughness = .86, metalness = .12, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const concrete = [mat('#414943'), mat('#4c4a40'), mat('#394542')];
  const darkMetal = mat('#202a29', .52, .68), edgeMetal = mat('#737d73', .48, .7), rust = mat('#bd6240', .72, .24), floorMat = mat('#343a35', .98, .04);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W + 8, WORLD_D + 8), floorMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.08; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(WORLD_W, MAP_W, '#727565', '#4b5148'); grid.position.y = -.065; grid.material.transparent = true; grid.material.opacity = .24; scene.add(grid);
  const solidCells = [];
  const cellToWorld = (x, z) => new THREE.Vector3((x - MAP_W / 2 + .5) * TILE, 0, (z - MAP_H / 2 + .5) * TILE);
  const wallAt = (x, z) => { const mx = Math.floor(x / TILE + MAP_W / 2), mz = Math.floor(z / TILE + MAP_H / 2); return mz < 0 || mz >= MAP_H || mx < 0 || mx >= MAP_W || MAP[mz][mx] === '#'; };
  for (let z = 0; z < MAP_H; z++) for (let x = 0; x < MAP_W; x++) {
    if (MAP[z][x] !== '#') continue;
    const p = cellToWorld(x, z), height = 4.8 + ((x * 7 + z * 3) % 3) * .35;
    const wall = new THREE.Mesh(boxGeo, concrete[(x + z) % concrete.length]);
    wall.position.set(p.x, height / 2, p.z); wall.scale.set(TILE, height, TILE); wall.castShadow = true; wall.receiveShadow = true; scene.add(wall); solidCells.push({ x: p.x, z: p.z, r: TILE * .5 });
    const stripe = new THREE.Mesh(boxGeo, (x + z) % 4 === 0 ? rust : darkMetal);
    stripe.position.set(p.x, 1.05, p.z + TILE * .505); stripe.scale.set(TILE * .82, .11, .04); scene.add(stripe);
    if ((x * 3 + z) % 8 === 0) {
      const lamp = new THREE.Mesh(boxGeo, mat('#d7a367', .4, .1, { emissive: '#ad5b2c', emissiveIntensity: 1.4 }));
      lamp.position.set(p.x, height - .35, p.z); lamp.scale.set(.4, .08, .08); scene.add(lamp);
    }
  }
  function addCrate(x, z, size = 1) {
    const p = cellToWorld(x, z), g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const body = new THREE.Mesh(boxGeo, darkMetal); body.scale.set(1.2 * size, 1.35 * size, 1.2 * size); body.position.y = .68 * size; body.castShadow = body.receiveShadow = true; g.add(body);
    const band = new THREE.Mesh(boxGeo, rust); band.scale.set(1.23 * size, .12 * size, 1.23 * size); band.position.y = .95 * size; g.add(band); scene.add(g);
  }
  [[2,8],[4,10],[14,2],[16,8],[11,11],[6,2],[18,6]].forEach(([x,z],i) => { if (!wallAt((x - MAP_W / 2 + .5) * TILE,(z - MAP_H / 2 + .5) * TILE)) addCrate(x,z,i%3===0?1.15:.85); });

  const player = { x: (3.3 - MAP_W / 2 + .5) * TILE, z: (2.5 - MAP_H / 2 + .5) * TILE, yaw: Math.PI / 2, pitch: 0, health: 100, ammo: 30, reserve: 180, kills: 0, shots: 0, hits: 0 };
  const mission = { stage: 0, started: false, elapsed: 0 };
  const relayPos = cellToWorld(8, 6), exitPos = cellToWorld(17, 11);
  const relay = new THREE.Group(); relay.position.set(relayPos.x, 0, relayPos.z);
  const relayBase = new THREE.Mesh(new THREE.CylinderGeometry(.68, .84, .28, 8), darkMetal); relayBase.position.y = .14; relayBase.castShadow = true; relay.add(relayBase);
  const relayCore = new THREE.Mesh(new THREE.BoxGeometry(.52, 1.35, .42), edgeMetal); relayCore.position.y = .92; relayCore.castShadow = true; relay.add(relayCore);
  const relayScreen = new THREE.Mesh(new THREE.BoxGeometry(.4, .48, .08), mat('#b6dc8b', .35, .12, { emissive: '#79bf59', emissiveIntensity: 1.7 })); relayScreen.position.set(0,.98,.25); relay.add(relayScreen);
  const relayRing = new THREE.Mesh(new THREE.TorusGeometry(1.08, .035, 6, 32), mat('#c8f16a', .36, .3, { emissive: '#8bbf4c', emissiveIntensity: .8 })); relayRing.rotation.x = Math.PI / 2; relayRing.position.y = .08; relay.add(relayRing); scene.add(relay);
  const exit = new THREE.Group(); exit.position.set(exitPos.x, 0, exitPos.z);
  const exitRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, .09, 8, 32), mat('#e6854e', .4, .25, { emissive: '#b84b26', emissiveIntensity: 1.4 })); exitRing.rotation.x = Math.PI / 2; exitRing.position.y = .1; exit.add(exitRing);
  const exitPost = new THREE.Mesh(boxGeo, darkMetal); exitPost.scale.set(.18,2.4,.18); exitPost.position.set(-1.25,1.2,0); exit.add(exitPost);
  const exitLight = new THREE.Mesh(boxGeo, mat('#d7e79a', .3, .1, { emissive: '#9abd50', emissiveIntensity: 1.5 })); exitLight.scale.set(.28,.2,.24); exitLight.position.set(-1.25,2.25,0); exit.add(exitLight); scene.add(exit);

  const gun = new THREE.Group(); camera.add(gun); gun.position.set(.38,-.31,-.62); gun.rotation.set(-.04,-.04,0);
  function gunPart(size, position, material, rotation = [0,0,0]) { const m = new THREE.Mesh(boxGeo, material); m.scale.set(...size); m.position.set(...position); m.rotation.set(...rotation); gun.add(m); }
  gunPart([.19,.18,.48],[0,-.04,-.06],darkMetal); gunPart([.22,.11,.34],[0,.055,-.1],edgeMetal); gunPart([.07,.08,.56],[0,.05,-.42],darkMetal); gunPart([.075,.09,.08],[0,.05,-.72],mat('#161c1b',.4,.6)); gunPart([.09,.22,.11],[.02,-.18,.02],mat('#333c37')); gunPart([.12,.025,.17],[0,.13,-.11],rust);
  const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(.09,8,6), mat('#ffe3a3',.25,.05,{emissive:'#ff9b4a',emissiveIntensity:4})); muzzleFlash.position.set(0,.05,-.79); muzzleFlash.visible = false; gun.add(muzzleFlash);

  const enemyMaterial = { armor: mat('#5d6963',.64,.52), dark: mat('#27312f',.55,.65), eye: mat('#ff7847',.3,.15,{emissive:'#ff4e28',emissiveIntensity:2.4}), hit: mat('#fff0c8',.3,.25,{emissive:'#ffcf8a',emissiveIntensity:1.6}) };
  const enemies = [], spawnPoints = [[16.5,2.5],[17.2,5.5],[14.5,10.4],[9.5,5.5],[3.6,10.5],[16.5,11.5],[2.5,6.5],[11.5,2.5],[6.5,11.5]];
  function makeEnemy(x, z, hp = 2) {
    const group = new THREE.Group(), torso = new THREE.Mesh(new THREE.BoxGeometry(.86,1.04,.5),enemyMaterial.armor); torso.position.y=1.48; torso.castShadow=true; group.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(.58,.28,.08),enemyMaterial.dark); chest.position.set(0,1.56,.29); group.add(chest);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.52,.42,.48),enemyMaterial.armor); head.position.y=2.28; head.castShadow=true; group.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.36,.09,.035),enemyMaterial.eye); visor.position.set(0,2.3,.25); group.add(visor);
    for (const side of [-1,1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.25,.78,.28),enemyMaterial.dark); arm.position.set(side*.61,1.43,.02); arm.rotation.z=-side*.14; arm.castShadow=true; group.add(arm);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.3,.72,.36),enemyMaterial.dark); leg.position.set(side*.24,.42,0); leg.castShadow=true; group.add(leg);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(.36,.32,.38),enemyMaterial.armor); shoulder.position.set(side*.56,1.83,0); group.add(shoulder);
    }
    group.position.set((x-MAP_W/2+.5)*TILE,0,(z-MAP_H/2+.5)*TILE); scene.add(group);
    const enemy = { group, x:group.position.x, z:group.position.z, hp, maxHp:hp, attack:1+Math.random(), speed:1.05+Math.random()*.25, phase:Math.random()*6, hit:0, dead:false }; enemies.push(enemy); return enemy;
  }

  const raycaster = new THREE.Raycaster(); raycaster.far = 18;
  let playing = false, paused = false, ended = false, reloadTime = 0, fireCooldown = 0, muzzleTime = 0, damageFlash = 0, pointerDown = false;
  const keys = Object.create(null), stickVector = {x:0,y:0}; let stickTouch = null, lookTouch = null;
  let lastFrame = performance.now();
  const fmtTime = t => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function notice(text) { const el=$('notice'); el.textContent=text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function updateHud() {
    $('health-value').textContent=Math.ceil(player.health); $('health-bar').style.width=`${Math.max(0,player.health)}%`; $('health-bar').style.background=player.health<35?'#f07845':'#c8f16a';
    $('health-caption').textContent=player.health<35?'CRITICAL // SEEK COVER':player.health<65?'DAMAGE SUSTAINED':'COMBAT READY';
    $('ammo').textContent=String(player.ammo).padStart(2,'0'); $('reserve').textContent=String(player.reserve).padStart(3,'0');
    $('hostiles').textContent=String(enemies.length).padStart(2,'0'); $('clock').textContent=fmtTime(mission.elapsed);
    $('wave').textContent=String(Math.min(mission.stage+1,3)).padStart(2,'0'); $('wave-progress').style.width=`${mission.stage*50}%`;
    const near=mission.stage===0?Math.hypot(player.x-relayPos.x,player.z-relayPos.z)<2.5:mission.stage===2?Math.hypot(player.x-exitPos.x,player.z-exitPos.z)<2.7:false;
    $('mobile-interact').classList.toggle('ready',near); $('mobile-interact').disabled=!near;
    $('directive').textContent=mission.stage===0?'Recover the signal from the relay.':mission.stage===1?`Hold the yard // ${enemies.length} hostiles remaining.`:'Reach the extraction beacon.';
    $('objective').textContent=mission.stage===0?'RECOVER THE SIGNAL':mission.stage===1?'HOLD THE YARD':'REACH EXTRACTION';
    $('hostiles-label').textContent=mission.stage===1?'HOSTILES':'OBJECTIVE';
  }
  function setStory(title, copy) { $('story-title').textContent=title; $('story-copy').textContent=copy; $('story-panel').classList.add('open'); if(document.pointerLockElement)document.exitPointerLock(); }
  function closeStory() { $('story-panel').classList.remove('open'); if(playing&&!paused&&matchMedia('(pointer:fine)').matches)canvas.requestPointerLock?.(); }
  function begin() {
    playing=true; paused=false; ended=false; mission.stage=0; mission.elapsed=0; player.x=(3.3-MAP_W/2+.5)*TILE; player.z=(2.5-MAP_H/2+.5)*TILE; player.yaw=-Math.PI/2; player.pitch=0; player.health=100; player.ammo=30; player.reserve=180; player.kills=0; player.shots=0; player.hits=0;
    enemies.splice(0).forEach(e=>scene.remove(e.group)); reloadTime=fireCooldown=muzzleTime=damageFlash=0; $('overlay').classList.add('hidden'); $('pause-panel').classList.remove('open'); $('end-panel').classList.remove('open'); $('mobile-controls').style.display='';
    $('story-panel').classList.add('open'); $('story-title').textContent='INBOUND // SCRAPLINE'; $('story-copy').textContent='Mara: “Rook, the depot beacon just woke up. Find the relay and pull its last transmission. Keep your channel dark.”';
    updateHud();
  }
  function endGame(win) {
    playing=false; paused=false; ended=true; if(document.pointerLockElement)document.exitPointerLock(); $('mobile-controls').style.display='none';
    $('end-kicker').textContent=win?'CHAPTER 01 // COMPLETE':'SIGNAL LOST'; $('end-title').innerHTML=win?'THE DEAD<br><em>CHANNEL.</em>':'ROOK<br><em>DOWN.</em>';
    $('end-copy').textContent=win?'Transmission recovered. A second signal is coming from beneath the city.':'The depot has gone quiet. Mara is already searching the dead channel.';
    $('final-kills').textContent=String(player.kills).padStart(2,'0'); $('final-time').textContent=fmtTime(mission.elapsed); $('final-accuracy').textContent=(player.shots?Math.round(player.hits/player.shots*100):100)+'%'; $('end-panel').classList.add('open');
  }
  function pause() { if(!playing)return; paused=!paused; $('pause-panel').classList.toggle('open',paused); if(paused&&document.pointerLockElement)document.exitPointerLock(); else if(!paused&&matchMedia('(pointer:fine)').matches)canvas.requestPointerLock?.(); lastFrame=performance.now(); }
  function reload() { if(!playing||paused||reloadTime||player.ammo===30||player.reserve<=0)return; reloadTime=1.15; $('reload-state').textContent='RELOADING'; }
  function shoot() {
    if(!playing||paused||reloadTime||fireCooldown>0)return;
    if(player.ammo<=0){reload();return;} player.ammo--; player.shots++; fireCooldown=.14; muzzleTime=.075; muzzleFlash.visible=true;
    gun.position.y=-.31-.04; setTimeout(()=>{gun.position.y=-.31;},65);
    raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
    const targets=[]; enemies.forEach(e=>{if(!e.dead)targets.push(...e.group.children);});
    const hit=raycaster.intersectObjects(targets,false)[0];
    if(hit){const enemy=enemies.find(e=>e.group.children.includes(hit.object)); if(enemy){enemy.hp--;enemy.hit=.12;player.hits++; if(enemy.hp<=0){enemy.dead=true;scene.remove(enemy.group);enemies.splice(enemies.indexOf(enemy),1);player.kills++; if(mission.stage===1&&!enemies.length)advanceMission();} const mark=$('hit-marker');mark.classList.remove('show');void mark.offsetWidth;mark.classList.add('show');}}
    updateHud();
  }
  function interact() {
    if(!playing||paused)return;
    if(mission.stage===0&&Math.hypot(player.x-relayPos.x,player.z-relayPos.z)<2.7){mission.stage=1;relayScreen.material=mat('#ec8e59',.35,.1,{emissive:'#d5552b',emissiveIntensity:2});for(let i=0;i<5;i++){const p=spawnPoints[(i*2+1)%spawnPoints.length];makeEnemy(p[0],p[1]);}setStory('TRANSMISSION // 04:17','Mara: “That’s not a distress call. It’s a map. The machines are digging under the old transit line—clear the yard, then get to extraction.”');notice('HOSTILES INBOUND');updateHud();}
    else if(mission.stage===2&&Math.hypot(player.x-exitPos.x,player.z-exitPos.z)<2.9)endGame(true);
  }
  function advanceMission(){mission.stage=2;exitRing.material=mat('#c8f16a',.35,.2,{emissive:'#9ecb4d',emissiveIntensity:2});notice('YARD SECURED // MOVE TO EXTRACTION');setStory('YARD SECURED','Mara: “I have the transmission. Extraction is live at the south gate. Move, Rook—something else just came online.”');updateHud();}
  function setCamera() { camera.position.set(player.x,1.68,player.z); camera.rotation.set(player.pitch,player.yaw,0,'YXZ'); }
  function blocked(x,z) {
    const r=.34;
    return wallAt(x-r,z-r)||wallAt(x+r,z-r)||wallAt(x-r,z+r)||wallAt(x+r,z+r)||solidCells.some(c=>Math.abs(x-c.x)<c.r+.42&&Math.abs(z-c.z)<c.r+.42);
  }
  function update(dt) {
    if(!playing||paused)return;
    mission.elapsed+=dt; fireCooldown=Math.max(0,fireCooldown-dt); muzzleTime=Math.max(0,muzzleTime-dt); muzzleFlash.visible=muzzleTime>0; damageFlash=Math.max(0,damageFlash-dt*2.7);
    if(reloadTime>0){reloadTime-=dt;if(reloadTime<=0){const load=Math.min(30-player.ammo,player.reserve);player.ammo+=load;player.reserve-=load;$('reload-state').textContent='';updateHud();}}
    const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-stickVector.y;
    const side=(keys.KeyD?1:0)-(keys.KeyA?1:0)+stickVector.x;
    const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw),rx=Math.cos(player.yaw),rz=-Math.sin(player.yaw);
    const mag=Math.hypot(forward,side)||1, speed=5.1*dt;
    const dx=(fx*forward+rx*side)/mag*speed, dz=(fz*forward+rz*side)/mag*speed;
    if(forward||side){if(!blocked(player.x+dx,player.z))player.x+=dx;if(!blocked(player.x,player.z+dz))player.z+=dz;}
    if(pointerDown&&matchMedia('(pointer:fine)').matches)shoot();
    for(const e of enemies){e.attack-=dt;e.phase+=dt*5;const dxp=player.x-e.x,dzp=player.z-e.z,d=Math.hypot(dxp,dzp);if(d>1.45){const vx=dxp/d*e.speed*dt,vz=dzp/d*e.speed*dt;if(!blocked(e.x+vx,e.z))e.x+=vx;if(!blocked(e.x,e.z+vz))e.z+=vz;e.group.position.set(e.x,Math.abs(Math.sin(e.phase))*.045,e.z);}else if(e.attack<=0){player.health=Math.max(0,player.health-9);damageFlash=.85;e.attack=1.05+Math.random()*.35;if(player.health<=0){updateHud();endGame(false);return;}}}
    if(mission.stage===0)relay.rotation.y+=dt*.32;
    if(mission.stage===2)exitRing.rotation.z+=dt*.5;
    setCamera();updateHud();
  }
  function animate(now) { requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;update(dt);renderer.render(scene,camera);$('damage-overlay').style.opacity=String(Math.min(.55,damageFlash*.4)); }
  requestAnimationFrame(animate);
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);}
  addEventListener('resize',resize);

  $('start').addEventListener('click',begin); $('resume').addEventListener('click',pause); $('restart').addEventListener('click',begin); $('again').addEventListener('click',begin);
  $('story-continue').addEventListener('click',closeStory); $('mobile-interact').addEventListener('pointerdown',e=>{e.preventDefault();interact();}); $('interact-key').addEventListener('click',interact);
  addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyR')reload();if(e.code==='KeyE')interact();if(e.code==='Escape'&&playing)pause();}); addEventListener('keyup',e=>keys[e.code]=false);
  addEventListener('blur',()=>{pointerDown=false;Object.keys(keys).forEach(k=>keys[k]=false);if(playing&&!paused)pause();});
  canvas.addEventListener('click',()=>{if(playing&&matchMedia('(pointer:fine)').matches&&!document.pointerLockElement)canvas.requestPointerLock?.();});
  document.addEventListener('mousemove',e=>{if(playing&&!paused&&document.pointerLockElement===canvas){player.yaw-=e.movementX*.0022;player.pitch=Math.max(-.72,Math.min(.72,player.pitch-e.movementY*.0018));}});
  canvas.addEventListener('pointerdown',e=>{if(!playing||paused)return;if(e.pointerType==='mouse'){pointerDown=true;shoot();}else if(e.clientX>innerWidth*.38){lookTouch=e.pointerId;canvas.setPointerCapture(e.pointerId);canvas.dataset.lookX=e.clientX;canvas.dataset.lookY=e.clientY;}});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'&&e.pointerId===lookTouch&&playing){const dx=e.clientX-Number(canvas.dataset.lookX||e.clientX),dy=e.clientY-Number(canvas.dataset.lookY||e.clientY);player.yaw-=dx*.006;player.pitch=Math.max(-.72,Math.min(.72,player.pitch-dy*.004));canvas.dataset.lookX=e.clientX;canvas.dataset.lookY=e.clientY;}});
  addEventListener('pointerup',e=>{if(e.pointerType==='mouse')pointerDown=false;if(e.pointerId===lookTouch)lookTouch=null;});
  const zone=$('stick-zone'),stick=$('stick');
  function moveStick(e){const r=zone.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy),max=39,m=Math.min(max,d);stick.style.transform=`translate(${d?dx/d*m:0}px,${d?dy/d*m:0}px)`;stickVector.x=d?dx/d*(m/max):0;stickVector.y=d?dy/d*(m/max):0;}
  function releaseStick(e){if(e.pointerId===stickTouch){stickTouch=null;stickVector.x=stickVector.y=0;stick.style.transform='translate(0,0)';}}
  zone.addEventListener('pointerdown',e=>{e.preventDefault();stickTouch=e.pointerId;zone.setPointerCapture(e.pointerId);moveStick(e);});zone.addEventListener('pointermove',e=>{if(e.pointerId===stickTouch)moveStick(e);});zone.addEventListener('pointerup',releaseStick);zone.addEventListener('pointercancel',releaseStick);
  $('mobile-fire').addEventListener('pointerdown',e=>{e.preventDefault();pointerDown=true;shoot();});$('mobile-fire').addEventListener('pointerup',()=>pointerDown=false);$('mobile-fire').addEventListener('pointercancel',()=>pointerDown=false);$('mobile-reload').addEventListener('pointerdown',e=>{e.preventDefault();reload();});
})();
