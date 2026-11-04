const $ = (id) => document.getElementById(id);
const rooms = {
  office: { title: 'The Oval Office', kicker: 'THE EXECUTIVE RESIDENCE', subtitle: 'WASHINGTON, D.C. · 9:41 AM', location: "THE PEOPLE'S HOUSE", intro: 'The papers are ready. What will you put your name to?', note: '“The first week sets the tone. Choose what matters most.”' },
  war: { title: 'Situation Room', kicker: 'NATIONAL SECURITY COUNCIL', subtitle: 'WEST WING · SECURE LEVEL', location: 'THE NERVE CENTER', intro: 'Your security team is standing by. Every option carries a cost.', note: '“Strength and restraint are not opposites. The world is watching.”' },
  press: { title: 'Press Briefing Room', kicker: 'THE JAMES S. BRADY BRIEFING ROOM', subtitle: 'WEST WING · PRESS CORPS', location: 'THE PUBLIC SQUARE', intro: 'The cameras are live. Set the tone for the national conversation.', note: '“People can handle hard truths. They cannot handle being misled.”' }
};
const decisionSet = {
  office: [
    { title: 'Sign the clean energy act', desc: 'Fund a modern grid and create jobs, with a near-term price tag.', effects: { approval: 3, economy: 1, climate: 5, budget: -4 }, message: 'A landmark clean energy act is signed. The transition begins.' },
    { title: 'Meet with congressional leaders', desc: 'Build a working relationship across the aisle before the agenda hardens.', effects: { approval: 2, unity: 4, economy: 1 }, message: 'Leaders leave the table with a path to keep talking.' },
    { title: 'Launch a rural broadband plan', desc: 'Connect underserved communities and open new economic opportunity.', effects: { approval: 2, economy: 3, budget: -2 }, message: 'A broadband plan puts rural communities on the map.' },
    { title: 'Invest in public schools', desc: 'Expand teacher training, school meals, and access to early learning.', effects: { approval: 3, unity: 1, budget: -3 }, message: 'A new investment puts students and teachers first.' },
    { title: 'Deliver a jobs and growth package', desc: 'Put infrastructure projects and small-business grants on the fast track.', effects: { approval: 2, economy: 5, budget: -4 }, message: 'The jobs package gets construction crews moving.' },
    { title: 'Protect access to healthcare', desc: 'Lower prescription costs and strengthen community clinics.', effects: { approval: 4, unity: 1, budget: -3 }, message: 'Families see relief in the cost of care.' }
  ],
  war: [
    { title: 'Open a diplomatic channel', desc: 'De-escalate a tense standoff through a trusted third party.', effects: { approval: 2, stability: 5, unity: 1 }, message: 'A quiet channel opens. The temperature drops.' },
    { title: 'Reinforce cyber defenses', desc: 'Harden public infrastructure and share threat intelligence with allies.', effects: { stability: 4, economy: -1, budget: -2 }, message: 'A coordinated cyber defense effort is underway.' },
    { title: 'Authorize humanitarian airlift', desc: 'Deliver emergency food and medicine to civilians in a conflict zone.', effects: { approval: 3, stability: 2, budget: -2 }, message: 'Relief flights are in the air with international partners.' },
    { title: 'Hold an allied security summit', desc: 'Coordinate a measured response and reaffirm shared commitments.', effects: { stability: 4, unity: 2, budget: -1 }, message: 'Allies leave with a common plan and a united front.' },
    { title: 'Order an intelligence review', desc: 'Get a clearer picture before making an irreversible commitment.', effects: { stability: 2, approval: 1, unity: 1 }, message: 'The intelligence community begins a rapid assessment.' },
    { title: 'Reduce overseas tensions', desc: 'Pause provocative exercises and invite independent observers.', effects: { stability: 4, approval: 1, unity: 2 }, message: 'A reciprocal pause creates room for diplomacy.' }
  ],
  press: [
    { title: 'Hold an open press conference', desc: 'Take unscripted questions and explain the week’s priorities.', effects: { approval: 4, unity: 1 }, message: 'A candid exchange dominates the evening news.' },
    { title: 'Address the nation', desc: 'Speak directly to families about the challenges and the plan ahead.', effects: { approval: 3, unity: 2 }, message: 'Your address reaches millions across the country.' },
    { title: 'Release the full report', desc: 'Publish an independent review, even where its findings are uncomfortable.', effects: { approval: 2, unity: 3, stability: 1 }, message: 'The complete report is made public. Trust is tested—and earned.' },
    { title: 'Visit a community in need', desc: 'Listen first, then announce a targeted federal response.', effects: { approval: 4, economy: 1, budget: -1 }, message: 'The visit brings national attention and resources to the community.' },
    { title: 'Give a bipartisan interview', desc: 'Make the case for finding common ground on a major issue.', effects: { unity: 4, approval: 2 }, message: 'A joint appearance shows the country a rare moment of agreement.' },
    { title: 'Correct the record', desc: 'Share verified facts and explain how the administration will follow up.', effects: { approval: 2, stability: 1 }, message: 'A fact sheet and public briefing clear up the confusion.' }
  ]
};
const initial = { week: 1, actions: 2, approval: 54, economy: 52, unity: 48, stability: 61, climate: 45, budget: 50, history: [54,53,55,54,55,54,56,54], log: [], headline: 'A new administration begins. The country is watching, and the work starts now.', room: 'office', finished: false };
let game = loadGame();
function loadGame(){ try { const s=JSON.parse(localStorage.getItem('theOvalSave')); return s && s.week ? {...initial,...s} : {...initial}; } catch { return {...initial}; } }
const statMeta = [ ['economy','Economy'], ['unity','National unity'], ['stability','Security'], ['climate','Climate'] ];
function clamp(n){ return Math.max(0,Math.min(100,Math.round(n))); }
function save(){ localStorage.setItem('theOvalSave',JSON.stringify(game)); }
let toastTimer;
function toast(message){ const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2500); }
function render(){
  const room=rooms[game.room]||rooms.office;
  $('date-label').textContent = `JAN ${20 + ((game.week-1)*7)%31} · YEAR ${Math.floor((game.week-1)/52)+1}`;
  $('term-label').textContent = game.week>208?'SECOND TERM':'FIRST TERM';
  $('week-number').textContent=String(game.week).padStart(2,'0');
  $('action-label').textContent=game.actions; $('ap-chip').textContent=game.actions;
  $('approval-value').innerHTML=`${game.approval}<span>%</span>`;
  $('room-title').textContent=room.title; $('room-kicker').textContent=room.kicker; $('room-subtitle').textContent=room.subtitle; $('scene-location').textContent=room.location;
  $('decision-room-title').textContent=game.room==='office'?'Decisions':game.room==='war'?'Security options':'Public engagement';
  $('decision-intro').textContent=room.intro; $('advisor-note').textContent=room.note;
  $('headline-text').textContent=game.headline;
  document.querySelectorAll('.room-tab').forEach(b=>b.classList.toggle('active',b.dataset.room===game.room));
  $('stat-list').innerHTML=statMeta.map(([key,label])=>`<div class="stat-row"><span class="stat-name">${label}</span><div class="stat-track"><div class="stat-fill" style="width:${game[key]}%;background:${game[key]<35?'#bd746c':game[key]>70?'#648c72':'#8c9b82'}"></div></div><b class="stat-value">${game[key]}</b></div>`).join('');
  const ds=decisionSet[game.room];
  $('decision-list').innerHTML=ds.map((d,i)=>`<button class="decision-card" data-decision="${i}" ${game.actions<1||game.finished?'disabled':''}><div class="decision-card-top"><h3>${d.title}</h3><span class="decision-cost">1 AP</span></div><p>${d.desc}</p></button>`).join('');
  document.querySelectorAll('.decision-card').forEach(b=>b.addEventListener('click',()=>makeDecision(Number(b.dataset.decision))));
  const vals=game.history.slice(-8), min=Math.min(...vals)-2, max=Math.max(...vals)+2;
  const points=vals.map((v,i)=>`${i*120/(vals.length-1||1)},${40-(v-min)/(max-min||1)*34}`).join(' ');
  $('chart-line').setAttribute('d',`M${points}`); $('chart-area').setAttribute('d',`M${points} L120,44 L0,44 Z`);
  $('approval-change').textContent=`${game.change>=0?'+':''}${game.change||0} THIS WEEK`;
  $('next-week').disabled=game.finished; $('end-turn-button').disabled=game.finished;
}
function makeDecision(index){
  if(game.actions<1||game.finished)return;
  const d=decisionSet[game.room][index]; if(!d)return;
  Object.entries(d.effects).forEach(([key,amount])=>{if(key in game)game[key]=clamp(game[key]+amount);});
  game.actions--; game.headline=d.message;
  game.log.unshift({week:game.week,room:rooms[game.room].title,title:d.title,text:d.message}); game.change=Object.values(d.effects).reduce((a,b)=>a+b,0);
  save();render();toast(`Decision recorded · ${game.actions} ${game.actions===1?'decision':'decisions'} remaining`);
}
function advanceWeek(){
  if(game.finished)return;
  game.week++; game.actions=2;
  const drift=(key,amount)=>game[key]=clamp(game[key]+amount);
  // Public mood shifts gently with the underlying state; good governance is cumulative.
  const mood=Math.round((game.economy+game.unity+game.stability+game.climate)/4);
  let delta=mood>60?1:mood<38?-2:0;
  drift('approval',delta); game.change=delta;
  if(game.week%4===0){
    const events=[
      {headline:'A major storm makes landfall. Emergency teams are mobilized across the coast.',effects:{stability:-2,economy:-1}},
      {headline:'A new jobs report brings cautious optimism to markets and households.',effects:{economy:2,approval:1}},
      {headline:'A diplomatic breakthrough offers a chance to cool a regional dispute.',effects:{stability:2,unity:1}},
      {headline:'Public attention turns to the rising cost of everyday essentials.',effects:{economy:-2,approval:-1}},
      {headline:'A bipartisan group of governors announces a shared climate initiative.',effects:{climate:2,unity:1}},
      {headline:'An independent watchdog calls for greater transparency in government.',effects:{unity:-1,approval:-1}}
    ];
    const event=events[Math.floor(Math.random()*events.length)]; game.headline=event.headline;
    Object.entries(event.effects).forEach(([k,v])=>drift(k,v));
    game.log.unshift({week:game.week,room:'The country',title:'A week in the news',text:event.headline});
  }else game.headline=delta>0?'Steady progress lifts the national mood. The work continues.':delta<0?'A difficult week tests the country’s patience. The work continues.':'The country takes stock. Your next choices will shape the week ahead.';
  game.history.push(game.approval); game.history=game.history.slice(-8);
  if(game.week>208){game.finished=true;showFinal();}
  save();render();toast('A new week begins. Your cabinet is ready.');
}
function openModal(html){$('modal').innerHTML=html;$('modal-backdrop').classList.remove('hidden');$('modal').querySelectorAll('.modal-close').forEach(button=>button.addEventListener('click',closeModal));}
function closeModal(){$('modal-backdrop').classList.add('hidden');}
function openLog(){openModal(`<button class="modal-close" aria-label="Close">×</button><div class="eyebrow">A RECORD OF YOUR PRESIDENCY</div><h2>Decision record</h2><p>Every action leaves a mark. Here is what your administration has done.</p><div class="log-list">${game.log.length?game.log.map(x=>`<div class="log-entry"><b>WEEK ${String(x.week).padStart(2,'0')} · ${x.room}</b><p><strong>${x.title}</strong> — ${x.text}</p></div>`).join(''):'<p>No decisions yet. Your first week is a blank page.</p>'}</div><div class="modal-actions"><button class="secondary modal-close">Close</button></div>`);}
function openAgenda(){openModal(`<button class="modal-close" aria-label="Close">×</button><div class="eyebrow">WEEK ${String(game.week).padStart(2,'0')} · THE WEST WING</div><h2>Weekly agenda</h2><p>Your schedule is yours to shape. Each week gives you two decision points. Choose from policy, security, and public engagement in any order.</p><div class="agenda-grid"><div class="agenda-cell"><span>MON · OVAL OFFICE</span><b>Domestic priorities</b></div><div class="agenda-cell"><span>TUE · SITUATION ROOM</span><b>Security briefing</b></div><div class="agenda-cell"><span>WED · CABINET ROOM</span><b>Economic outlook</b></div><div class="agenda-cell"><span>FRI · PRESS ROOM</span><b>Speak to the nation</b></div></div><div class="modal-actions"><button class="modal-close">Back to work</button></div>`);}
function openStats(){openModal(`<button class="modal-close" aria-label="Close">×</button><div class="eyebrow">HOW THE COUNTRY IS DOING</div><h2>National pulse</h2><p>Public approval is shaped by the state of the country. A healthy economy, strong unity, security, and climate progress all help sustain public confidence. Numbers move with your choices and the news.</p><div class="stats-explain"><b>Public approval</b> reflects the public's overall confidence. <b>Economy</b> tracks jobs and prosperity. <b>National unity</b> measures social cohesion. <b>Security</b> reflects stability at home and abroad. <b>Climate</b> tracks long-term environmental progress. Your budget is reflected in the costs described by each decision.</div><div class="modal-actions"><button class="modal-close">Understood</button></div>`);}
function showFinal(){openModal(`<div class="eyebrow">THE END OF YOUR FIRST TERM</div><h2>Your presidency, so far</h2><p>Four years in office have changed the country. Your final public approval is <b>${game.approval}%</b>. ${game.approval>=60?'The nation gives your leadership a strong mandate.':'The country remains divided on the road ahead.'} Your decisions are now part of the record.</p><div class="modal-actions"><button id="continue-game">Continue in office</button><button class="secondary" id="new-game">Begin a new presidency</button></div>`);$('continue-game').onclick=closeModal;$('new-game').onclick=()=>{localStorage.removeItem('theOvalSave');game={...initial,history:[...initial.history],log:[]};save();closeModal();render();};}
$('room-title').textContent=rooms[game.room].title;
document.querySelectorAll('.room-tab').forEach(b=>b.addEventListener('click',()=>{game.room=b.dataset.room;save();render();createRoom(game.room);}));
$('next-week').addEventListener('click',advanceWeek); $('end-turn-button').addEventListener('click',advanceWeek);
$('save-button').addEventListener('click',()=>{save();toast('Your presidency has been saved.');});
$('record-button').addEventListener('click',openLog);$('agenda-button').addEventListener('click',openAgenda);$('stats-info').addEventListener('click',openStats);
$('menu-button').addEventListener('click',()=>openModal(`<button class="modal-close" aria-label="Close">×</button><div class="eyebrow">THE OVAL · GAME MENU</div><h2>Your presidency</h2><p>Your progress is saved automatically on this device.</p><div class="modal-actions"><button id="menu-log">Decision record</button><button class="secondary" id="menu-reset">Start over</button></div>`));
$('modal-backdrop').addEventListener('click',e=>{if(e.target===$('modal-backdrop'))closeModal();});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
render();

// Three.js builds the room-scale, walk-in White House scenes. A canvas illustration is used if WebGL or the CDN is unavailable.
let THREE, renderer, scene, camera, roomGroup, raycaster, pointer, controls, dragging=false, lastX=0, lookOffset=0, activeTargets=[];
const player={x:0,z:3.45,yaw:0};
let nearbyNpc=null, moveVector={forward:0,back:0,left:0,right:0}, lastMove=0;
const npcRoster={
  office:[
    {name:'Chief of Staff Maya Chen',role:'Chief of Staff',color:'#384f68',x:-1.2,z:.75,lines:['The first week is about setting priorities. Which issue should we put at the top of the agenda?','I can bring the congressional leaders together before the week is out. What would you like me to emphasize?','The cabinet is ready to move. Your choices will shape the tone of this administration.']},
    {name:'Secretary of State Daniel Reyes',role:'Secretary of State',color:'#6e5141',x:1.2,z:.75,lines:['Our allies are asking for steady leadership. I recommend opening a direct diplomatic channel.','Diplomacy takes patience, but it gives us more options than acting alone.','I have calls scheduled with our partners. Shall I share your priorities with them?']},
  ],
  war:[
    {name:'Secretary of Defense Amina Patel',role:'Secretary of Defense',color:'#4e5e55',x:-3.5,z:.7,lines:['Our commanders are ready, but time and restraint are strategic advantages too.','The situation is tense. I recommend we coordinate closely with our allies before any escalation.','I can prepare options for you. We should keep humanitarian needs in view.']},
    {name:'National Security Advisor James Okafor',role:'National Security Advisor',color:'#445a71',x:3.45,z:.65,lines:['The intelligence picture is still developing. We should be careful about what we assume.','A secure diplomatic channel could create room to de-escalate.','I will bring the principals together for a full briefing.']},
    {name:'Chair of the Joint Chiefs',role:'Senior Military Advisor',color:'#6b5544',x:0,z:-3.15,lines:['Our service members are prepared. The decision on when and how to act is yours.','We will provide clear options and the risks attached to each.']}
  ],
  press:[
    {name:'Press Secretary Nora Williams',role:'Press Secretary',color:'#724c45',x:-3.25,z:-.3,lines:['The press corps is ready. A clear, candid answer goes a long way.','We can prepare a briefing with verified facts and make the full report available.','The public wants to know what comes next. Let us explain the plan plainly.']},
    {name:'Senior Correspondent Alex Morgan',role:'White House Correspondent',color:'#536273',x:3.25,z:.1,lines:['People at home want to know how this decision will affect their families.','Will you share how the administration plans to work with both parties?','The public deserves a straight answer. What should they expect next?']}
  ]
};
const host=$('scene-container');
function bindWalkControls(){
  document.querySelectorAll('[data-move]').forEach(button=>{
    const move=()=>{moveVector[button.dataset.move]=1;};
    const stop=()=>{moveVector[button.dataset.move]=0;};
    button.addEventListener('pointerdown',e=>{e.preventDefault();move();});
    ['pointerup','pointercancel','pointerleave'].forEach(type=>button.addEventListener(type,stop));
  });
  window.addEventListener('pointerup',()=>{Object.keys(moveVector).forEach(key=>moveVector[key]=0);});
}
try { THREE=await import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js'); start3D(); }
catch(error){ console.warn('3D renderer unavailable; using illustrated fallback.',error); startFallback(); }
function start3D(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#a9bac0');scene.fog=new THREE.Fog('#a9bac0',13,27);
  camera=new THREE.PerspectiveCamera(60,1,.1,80);camera.position.set(0,2.15,8.5);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;host.replaceChildren(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#f5eee0','#465463',2.2));const sun=new THREE.DirectionalLight('#fff0d4',3.3);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);const fill=new THREE.DirectionalLight('#adc9db',1.2);fill.position.set(5,4,-4);scene.add(fill);
  raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();buildRoom(game.room);resize();window.addEventListener('resize',resize);renderer.domElement.addEventListener('pointerdown',onPointerDown);renderer.domElement.addEventListener('pointerup',onPointerUp);renderer.domElement.addEventListener('pointermove',onPointerMove);renderer.domElement.addEventListener('click',onSceneClick);bindWalkControls();window.addEventListener('keydown',onWalkKeyDown);window.addEventListener('keyup',onWalkKeyUp);$('talk-button').addEventListener('click',talkToNearby);animate();setTimeout(()=>$('scene-loader').classList.add('done'),450);
}
function resize(){if(!renderer)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function mat(color,roughness=.72,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(parent,name,pos,size,color,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color,opts.roughness??.75,opts.metalness??0));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;m.userData={target:opts.target||null};parent.add(m);if(opts.target)activeTargets.push(m);return m;}
function cyl(parent,pos,r1,r2,h,color,segments=24){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat(color));m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
function sphere(parent,pos,r,color){const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,16),mat(color,.45));m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
function targetBox(parent,name,pos,size,color){return box(parent,name,pos,size,color,{target:name});}
function buildNpc(npc){
  const person=new THREE.Group();person.position.set(npc.x,0,npc.z);person.userData.npc=npc;roomGroup.add(person);
  const uniform=mat(npc.color), trousers=mat('#303944'), skin=mat('#bc9278'), hair=mat('#393531');
  const part=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;person.add(mesh);return mesh;};
  part(new THREE.CylinderGeometry(.24,.31,.78,12),uniform,0,1.08,0);
  part(new THREE.SphereGeometry(.22,16,12),skin,0,1.68,0);
  part(new THREE.SphereGeometry(.225,16,10,0,Math.PI*2,0,Math.PI*.48),hair,0,1.76,-.015);
  part(new THREE.BoxGeometry(.13,.5,.16),trousers,-.13,.42,0).rotation.z=-.03;
  part(new THREE.BoxGeometry(.13,.5,.16),trousers,.13,.42,0).rotation.z=.03;
  for(const x of [-.34,.34])part(new THREE.CylinderGeometry(.075,.085,.52,10),uniform,x,1.08,0).rotation.z=x*.28;
  part(new THREE.BoxGeometry(.105,.12,.035),mat('#d2b778'),0,1.18,.245);
  person.traverse(o=>{if(o.isMesh){o.userData.npc=npc;}});activeTargets.push(person);
}
function addRoomNpcs(){(npcRoster[game.room]||npcRoster.office).forEach(buildNpc);}
function updateCamera(){if(!camera)return;camera.position.set(player.x,1.68,player.z);const yaw=player.yaw+lookOffset;camera.lookAt(player.x+Math.sin(yaw),1.58,player.z-Math.cos(yaw));}
function clearRoom(){if(roomGroup){scene.remove(roomGroup);roomGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}activeTargets=[];roomGroup=new THREE.Group();scene.add(roomGroup);}
function addRoomShell(wall='#e6dfd0',floor='#80664e'){
  const floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(12,11),mat(floor));floorMesh.rotation.x=-Math.PI/2;floorMesh.position.y=0;floorMesh.receiveShadow=true;roomGroup.add(floorMesh);
  box(roomGroup,'back-wall',[0,2.7,-4.8],[11,5.4,.28],wall);box(roomGroup,'left-wall',[-5.5,2.7,0],[.28,5.4,10],wall);box(roomGroup,'right-wall',[5.5,2.7,0],[.28,5.4,10],wall);
  box(roomGroup,'crown-back',[0,5.28,-4.6],[11,.16,.28],'#f4ecdc');box(roomGroup,'base-back',[0,.18,-4.6],[11,.3,.28],'#5b4938');
  // Rug and floorboard inlays
  const rug=new THREE.Mesh(new THREE.BoxGeometry(7,.035,5.1),mat('#b4a07d'));rug.position.set(0,.025,-.55);rug.receiveShadow=true;roomGroup.add(rug);
  const inset=new THREE.Mesh(new THREE.BoxGeometry(6.6,.04,4.7),mat('#7f6d54'));inset.position.set(0,.05,-.55);roomGroup.add(inset);
  const rugCenter=new THREE.Mesh(new THREE.BoxGeometry(6.3,.04,4.4),mat('#b5a27f'));rugCenter.position.set(0,.07,-.55);roomGroup.add(rugCenter);
  // Window with brass mullions, distant skyline and soft daylight
  for(const x of [-3.35,0,3.35]){
    box(roomGroup,'window frame',[x,3.35,-4.62],[2.65,2.5,.1],'#725c42');box(roomGroup,'daylight',[x,3.35,-4.54],[2.42,2.28,.06],'#8db8c8',{roughness:.4});
    box(roomGroup,'mullion',[x,3.35,-4.48],[.055,2.3,.045],'#d2b778');box(roomGroup,'sill',[x,2.16,-4.43],[2.7,.1,.18],'#d0b988');
    for(let i=0;i<5;i++){const bx=x-1.08+i*.53;box(roomGroup,'distant building',[bx,2.55+(i%3)*.17,-4.49],[.22,.55+(i%3)*.3,.04],i%2?'#789aaa':'#66889a');}
  }
  // ceiling cornice and framed presidential landscape
  box(roomGroup,'back picture frame',[0,4.72,-4.58],[1.45,.82,.16],'#a58350');box(roomGroup,'landscape',[0,4.72,-4.48],[1.27,.64,.05],'#637d79');
  box(roomGroup,'landscape hill',[0,4.55,-4.44],[1.2,.15,.035],'#4f6b60');
  box(roomGroup,'ceiling molding',[0,5.38,-.2],[11,.16,9.3],'#e9dfcc');
}
function addPlant(x,z){cyl(roomGroup,[x,.42,z],.35,.3,.75,'#ad9c82');for(let i=0;i<7;i++){const a=i*Math.PI*2/7;sphere(roomGroup,[x+Math.cos(a)*.23,1.15+(i%3)*.2,z+Math.sin(a)*.22],.32,'#426a51');}}
function addFlag(x,z,color){cyl(roomGroup,[x,.95,z],.035,.055,1.9,'#b1915d');cyl(roomGroup,[x,.08,z],.28,.34,.16,'#a98c5d');box(roomGroup,'flag cloth',[x+.27,1.56,z],[.52,.72,.035],color);box(roomGroup,'flag stripe',[x+.27,1.6,z+.024],[.5,.1,.015],'#eee5d3');}
function addDesk(target='Executive desk'){
  // substantial executive desk, carved edge, three drawers and brass feet
  box(roomGroup,'desk top',[0,1.13,-.45],[3.3,.19,1.58],'#543b2a',{target});box(roomGroup,'desk apron',[0,.83,-.45],[2.95,.43,1.25],'#684a31');
  for(const x of [-1.25,-.82,.82,1.25])box(roomGroup,'desk leg',[x,.42,-.45],[.14,.72,.16],'#4c3527');
  box(roomGroup,'desk blotter',[0,1.24,-.58],[1.45,.025,.75],'#263a3c');
  // papers, lamp, pen cup, telephone
  box(roomGroup,'papers',[-.7,1.27,-.48],[.52,.035,.43],'#e6dcc7');box(roomGroup,'paper top',[-.66,1.3,-.48],[.42,.012,.34],'#f4eddd');
  cyl(roomGroup,[.74,1.34,-.53],.07,.07,.17,'#b2925d');cyl(roomGroup,[.74,1.47,-.53],.24,.03,.13,'#c7a86f');
  box(roomGroup,'telephone',[1.02,1.28,-.04],[.34,.12,.23],'#22313b');
  sphere(roomGroup,[.12,1.5,-.51],.17,'#b39157');
}
function buildOffice(){
  addRoomShell('#eee8da','#6d5943');
  // decorative wall paneling
  for(const x of [-4.3,-2.35,2.35,4.3]){box(roomGroup,'wall panel',[x,3.55,-4.62],[1.45,2.7,.07],'#ddd3c1');box(roomGroup,'panel inset',[x,3.55,-4.56],[1.3,2.52,.04],'#e9e1d3');}
  addDesk('Executive desk');
  // visitor chair and armchairs
  for(const x of [-2.25,2.25]){box(roomGroup,'visitor chair seat',[x,.72,1.05],[1,.2,.9],'#526259');box(roomGroup,'chair back',[x,1.27,1.43],[1,.95,.18],'#3e554b');for(const dx of [-.4,.4])box(roomGroup,'chair leg',[x+dx,.34,.75],[.08,.7,.08],'#5b402c');}
  box(roomGroup,'sofa seat',[3.15,.48,2.5],[2.1,.28,.7],'#82918a');box(roomGroup,'sofa back',[3.15,.86,2.78],[2.1,.58,.18],'#63756d');
  // flag, globe, side table and small details
  addFlag(-4.05,1.65,'#304d75');addFlag(-3.55,1.65,'#8e4f43');
  cyl(roomGroup,[3.75,.6,-1.7],.52,.58,.12,'#674c35');cyl(roomGroup,[3.75,.32,-1.7],.08,.15,.46,'#775638');sphere(roomGroup,[3.75,1.06,-1.7],.3,'#567b82');cyl(roomGroup,[3.75,1.06,-1.7],.305,.305,.04,'#ba9b5b');
  addPlant(4.55,-3.5);addPlant(-4.5,-3.45);
  targetBox(roomGroup,'Cabinet briefing',[-3.72,1.8,-3.75],[.65,.85,.18],'#9c7951');
}
function buildWar(){
  addRoomShell('#a9b5b8','#444d51');
  // change shell details and provide a dark, secure, modern ops center
  box(roomGroup,'rear display backing',[0,3.3,-4.55],[7.2,2.45,.16],'#263840');
  for(let i=0;i<4;i++){const x=-2.7+i*1.8;box(roomGroup,'monitor',[x,3.38,-4.43],[1.6,1.35,.08],i===1?'#526f73':'#3e5b61');box(roomGroup,'monitor map',[x,3.38,-4.37],[1.43,1.16,.025],i===1?'#829989':'#73909a');}
  // glowing map markers and data bars
  for(let i=0;i<10;i++){sphere(roomGroup,[-3.25+(i*0.71)%6.5,2.95+(i%4)*.16,-4.33],.035,i%3?'#e1c277':'#bd776a');}
  for(let i=0;i<5;i++)box(roomGroup,'data bar',[-2.8+i*1.3,2.62,-4.33],[.82,.04+(i%2)*.08,.03],'#aac0aa');
  box(roomGroup,'situation table',[0,1.12,-.1],[4.3,.2,2.8],'#344348');box(roomGroup,'table base',[0,.56,-.1],[1,.95,1],'#48565a');
  box(roomGroup,'table map',[0,1.25,-.1],[3.6,.035,2.1],'#667d76');
  for(const x of [-2.6,-1.3,0,1.3,2.6]){cyl(roomGroup,[x,.52,1.6],.42,.42,.18,'#3b4950');cyl(roomGroup,[x,.27,1.6],.08,.12,.42,'#79838a');}
  // recessed lights and tall equipment racks
  for(const x of [-4.25,4.25]){box(roomGroup,'server rack',[x,2,-3.7],[.75,3.2,.65],'#34434a');for(let i=0;i<7;i++)box(roomGroup,'rack lights',[x,1+i*.36,-3.35],[.45,.025,.025],i%2?'#80a99b':'#c6a971');}
  targetBox(roomGroup,'Crisis briefing',[0,1.4,-.14],[2.2,.5,1.45],'#677c73');
}
function buildPress(){
  addRoomShell('#d8d1c3','#776653');
  // iconic press briefing backdrop in White House blue
  box(roomGroup,'press backdrop',[0,3.12,-4.56],[8.6,2.95,.18],'#34516a');
  for(let x=-3.6;x<=3.61;x+=1.2){for(let y=2.2;y<4.2;y+=.62){const star= new THREE.Mesh(new THREE.CircleGeometry(.06,5),mat('#d7c493'));star.position.set(x,y,-4.44);roomGroup.add(star);}}
  box(roomGroup,'presidential seal ring',[0,3.7,-4.39],[1.05,1.05,.09],'#c6a96a');cyl(roomGroup,[0,3.7,-4.31],.43,.43,.045,'#d7c28c',40);
  // lectern and microphones
  box(roomGroup,'lectern base',[0,.97,-1.72],[1.45,1.65,.73],'#79563a');box(roomGroup,'lectern front',[0,1.05,-1.32],[1.6,1.05,.13],'#896345');box(roomGroup,'lectern top',[0,1.84,-1.62],[1.85,.13,.86],'#533d2e');
  for(const x of [-.25,.25]){cyl(roomGroup,[x,2.12,-1.55],.025,.025,.48,'#292d31',12);sphere(roomGroup,[x,2.36,-1.55],.055,'#282e33');}
  // audience rows
  for(let row=0;row<2;row++)for(let i=0;i<5;i++){const x=(i-2)*1.35,z=1.3+row*1.75;box(roomGroup,'press seat',[x,.62,z],[1.05,.25,.72],'#40566a');box(roomGroup,'seat back',[x,1.05,z+.26],[1.05,.8,.17],'#344a5f');}
  // camera tripods
  for(const x of [-4,4]){box(roomGroup,'camera body',[x,1.9,-.3],[.58,.4,.5],'#222d32');sphere(roomGroup,[x,1.9,-.02],.19,'#172227');for(const dx of [-.3,.3])box(roomGroup,'tripod',[x+dx,.77,-.3],[.045,1.6,.045],'#343a3b');}
  targetBox(roomGroup,'Press podium',[0,1.36,-1.6],[1.85,1.2,.9],'#855f40');
}
function buildRoom(name){clearRoom();player.x=0;player.z=3.45;player.yaw=0;lookOffset=0;nearbyNpc=null;if(name==='war')buildWar();else if(name==='press')buildPress();else buildOffice();addRoomNpcs();updateCamera();resize();}
function createRoom(name){if(THREE&&renderer){buildRoom(name);$('interaction-prompt').innerHTML='';$('scene-hint').style.opacity='1';setTimeout(()=>$('scene-hint').style.opacity='0',4500);}else{player.x=0;player.z=3.45;player.yaw=0;nearbyNpc=null;drawFallback(name);updateNearbyNpc();}}
function onPointerDown(e){if(e.target.closest('.walk-controls'))return;dragging=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);}
function onPointerUp(){dragging=false;}
function onPointerMove(e){if(!dragging)return;player.yaw=Math.max(-1.35,Math.min(1.35,player.yaw+(e.clientX-lastX)*.004));lastX=e.clientX;updateCamera();}
function onWalkKeyDown(e){const key=e.key.toLowerCase(),map={w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',d:'right',arrowright:'right'};if(map[key]){e.preventDefault();moveVector[map[key]]=1;}if(key==='e'||key==='enter')talkToNearby();}
function onWalkKeyUp(e){const map={w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',d:'right',arrowright:'right'};if(map[e.key.toLowerCase()])moveVector[map[e.key.toLowerCase()]]=0;}
function blocked(x,z){if(Math.abs(x)>4.65||z< -4.15||z>4.18)return true;
  if(game.room==='office'&&x> -1.78&&x<1.78&&z> -1.38&&z<.48)return true;
  if(game.room==='war'&&Math.abs(x)<2.35&&z> -1.72&&z<1.52)return true;
  if(game.room==='press'&&Math.abs(x)<1.12&&z> -2.35&&z< -1.05)return true;
  return false;
}
function distanceTo(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function movePlayer(dt){if($('modal-backdrop')&&!$('modal-backdrop').classList.contains('hidden'))return;let forward=moveVector.forward-moveVector.back,side=moveVector.right-moveVector.left;if(!forward&&!side)return;const mag=Math.hypot(forward,side);forward/=mag;side/=mag;const yaw=player.yaw+lookOffset,speed=3.15*dt;const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*speed;const nx=player.x+dx,nz=player.z+dz;if(!blocked(nx,player.z))player.x=nx;if(!blocked(player.x,nz))player.z=nz;updateCamera();if(!renderer)drawFallback(game.room);}
function updateNearbyNpc(){const people=(npcRoster[game.room]||[]);let next=null,best=2.1;for(const npc of people){const d=distanceTo(player,npc);if(d<best){best=d;next=npc;}}if(next!==nearbyNpc){nearbyNpc=next;$('interaction-prompt').innerHTML=next?`<b>${next.name}</b><span>${next.role} · Press <kbd>E</kbd> or tap Talk</span>`:'';}}
function talkToNearby(){if(!nearbyNpc){toast('Walk closer to a minister or advisor to talk.');return;}const npc=nearbyNpc;const line=npc.lines[(game.week+game.log.length)%npc.lines.length];openModal(`<button class="modal-close" aria-label="Close">×</button><div class="eyebrow">PRIVATE CONVERSATION · WEEK ${String(game.week).padStart(2,'0')}</div><h2>${npc.name}</h2><p class="conversation-role">${npc.role}</p><blockquote class="conversation-quote">“${line}”</blockquote><div class="conversation-options"><button data-reply="policy">Discuss the weekly agenda</button><button class="secondary" data-reply="listen">Ask for their recommendation</button></div><div class="modal-actions"><button class="modal-close">End conversation</button></div>`);$('modal').querySelectorAll('[data-reply]').forEach(button=>button.addEventListener('click',()=>{const reply=button.dataset.reply==='policy'?'You share your priorities. Your advisor will prepare options for the next briefing.':'You ask for a candid recommendation. The conversation is added to your presidential record.';if(button.dataset.reply==='listen'){game.log.unshift({week:game.week,room:rooms[game.room].title,title:`Conversation with ${npc.name}`,text:line});save();}toast(reply);closeModal();}));}
function onSceneClick(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(activeTargets,true)[0];if(!hit)return;const npc=hit.object.userData.npc||hit.object.parent?.userData.npc;if(npc){if(distanceTo(player,npc)<=2.1){nearbyNpc=npc;talkToNearby();}else toast(`Walk closer to ${npc.name} to talk.`);return;}const name=hit.object.userData.target;if(name){const tab=name.includes('Press')?'press':name.includes('Crisis')?'war':'office';if(tab!==game.room){game.room=tab;render();createRoom(tab);}toast(`${name} · Use the decision panel to take action`);}}
function animate(){requestAnimationFrame(animate);if(renderer){const now=performance.now(),dt=Math.min(.05,(now-lastMove)/1000||0);lastMove=now;movePlayer(dt);updateNearbyNpc();renderer.render(scene,camera);}}
function startFallback(){const canvas=document.createElement('canvas');canvas.className='fallback-scene';host.replaceChildren(canvas);function fit(){const dpr=Math.min(devicePixelRatio||1,2),w=host.clientWidth,h=host.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';const c=canvas.getContext('2d');c.scale(dpr,dpr);drawFallback(game.room,c,w,h);}window.addEventListener('resize',fit);window.drawFallback=drawFallback;bindWalkControls();window.addEventListener('keydown',onWalkKeyDown);window.addEventListener('keyup',onWalkKeyUp);$('talk-button').addEventListener('click',talkToNearby);fit();updateNearbyNpc();function fallbackAnimate(){const now=performance.now(),dt=Math.min(.05,(now-lastMove)/1000||0);lastMove=now;movePlayer(dt);updateNearbyNpc();requestAnimationFrame(fallbackAnimate);}requestAnimationFrame(fallbackAnimate);$('scene-hint').innerHTML='<span>✦</span> Walk with WASD / arrows or the pad · approach someone and press E or Talk';$('scene-hint').style.opacity='1';setTimeout(()=>$('scene-loader').classList.add('done'),300);}
function drawFallback(name,ctx,w,h){
  const canvas=host.querySelector('canvas');if(!ctx&&canvas){const dpr=Math.min(devicePixelRatio||1,2);ctx=canvas.getContext('2d');w=host.clientWidth;h=host.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.scale(dpr,dpr);}if(!ctx)return;
  const room=name==='war'?'war':name==='press'?'press':'office';const g=ctx;g.clearRect(0,0,w,h);
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,room==='war'?'#415360':room==='press'?'#31465a':'#a7c3ca');sky.addColorStop(.52,room==='war'?'#8a999b':room==='press'?'#586b7c':'#d7cdb5');sky.addColorStop(1,'#263340');g.fillStyle=sky;g.fillRect(0,0,w,h);
  const wall=room==='war'?'#899596':room==='press'?'#d8d1c4':'#e9e1d3',floor=room==='war'?'#414c50':room==='press'?'#776653':'#6d5943';
  g.fillStyle=wall;g.beginPath();g.moveTo(w*.1,h*.08);g.lineTo(w*.9,h*.08);g.lineTo(w*.95,h*.72);g.lineTo(w*.05,h*.72);g.closePath();g.fill();
  g.fillStyle=floor;g.beginPath();g.moveTo(w*.05,h*.72);g.lineTo(w*.95,h*.72);g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fill();
  // Perspective floorboards and central rug
  g.strokeStyle='#ffffff20';g.lineWidth=1;for(let i=-5;i<=5;i++){g.beginPath();g.moveTo(w/2+i*14,h*.72);g.lineTo(w/2+i*70,h);g.stroke();}for(let y=.78;y<1;y+=.055){g.beginPath();g.moveTo(0,h*y);g.lineTo(w,h*y);g.stroke();}
  g.fillStyle=room==='war'?'#667577':room==='press'?'#9b8870':'#b0a081';g.beginPath();g.moveTo(w*.25,h*.72);g.lineTo(w*.75,h*.72);g.lineTo(w*.9,h);g.lineTo(w*.1,h);g.closePath();g.fill();
  if(room==='office'){
    // daylight and skyline windows
    for(const x of [.25,.5,.75]){g.fillStyle='#9dc2cd';g.fillRect(w*(x-.095),h*.17,w*.19,h*.32);g.strokeStyle='#b79865';g.lineWidth=4;g.strokeRect(w*(x-.095),h*.17,w*.19,h*.32);g.beginPath();g.moveTo(w*x,h*.17);g.lineTo(w*x,h*.49);g.moveTo(w*(x-.095),h*.33);g.lineTo(w*(x+.095),h*.33);g.stroke();g.fillStyle='#648999';for(let i=0;i<5;i++)g.fillRect(w*(x-.085+i*.034),h*(.38+(i%2)*.035),w*.022,h*.1);}
    g.fillStyle='#49392c';g.fillRect(w*.27,h*.49,w*.46,h*.13);g.fillStyle='#77563b';g.fillRect(w*.3,h*.61,w*.4,h*.09);g.fillStyle='#2e4241';g.fillRect(w*.4,h*.51,w*.2,h*.075);
    g.fillStyle='#596c62';g.fillRect(w*.32,h*.65,w*.12,h*.15);g.fillRect(w*.56,h*.65,w*.12,h*.15);g.fillStyle='#c2a66f';g.beginPath();g.arc(w*.68,h*.55,w*.025,0,Math.PI*2);g.fill();
    g.fillStyle='#426452';g.fillRect(w*.12,h*.48,w*.04,h*.18);g.fillRect(w*.84,h*.45,w*.045,h*.2);g.fillStyle='#53765b';for(const x of [.12,.84])for(let i=0;i<4;i++){g.beginPath();g.arc(w*x+(Math.random()-.5)*w*.04,h*(.45+Math.random()*.09),w*.028,0,Math.PI*2);g.fill();}
  }else if(room==='war'){
    g.fillStyle='#24383e';g.fillRect(w*.19,h*.16,w*.62,h*.35);for(let i=0;i<4;i++){g.fillStyle=['#7b9798','#607b7d','#829586','#527078'][i];g.fillRect(w*(.22+i*.147),h*.19,w*.13,h*.25);g.strokeStyle='#b8c2ad';g.strokeRect(w*(.22+i*.147),h*.19,w*.13,h*.25);}g.fillStyle='#45565a';g.fillRect(w*.25,h*.58,w*.5,h*.1);g.fillStyle='#7e9186';g.beginPath();g.moveTo(w*.3,h*.58);g.lineTo(w*.7,h*.58);g.lineTo(w*.77,h*.8);g.lineTo(w*.23,h*.8);g.closePath();g.fill();for(let i=0;i<7;i++){g.fillStyle=i%2?'#dbbd77':'#d08173';g.beginPath();g.arc(w*(.3+i*.06),h*(.3+(i%3)*.035),4,0,Math.PI*2);g.fill();}
  }else{
    g.fillStyle='#34516a';g.fillRect(w*.13,h*.12,w*.74,h*.42);g.strokeStyle='#c9ad72';g.strokeRect(w*.13,h*.12,w*.74,h*.42);for(let x=.17;x<.86;x+=.07){for(let y=.17;y<.5;y+=.07){g.fillStyle='#d5c795';g.font='10px sans-serif';g.fillText('✦',w*x,h*y);}}g.fillStyle='#c6a96a';g.beginPath();g.arc(w*.5,h*.3,w*.06,0,Math.PI*2);g.fill();g.fillStyle='#76543a';g.fillRect(w*.43,h*.52,w*.14,h*.29);g.fillStyle='#9b7550';g.fillRect(w*.4,h*.52,w*.2,h*.07);g.fillStyle='#3b5267';for(const x of [.2,.32,.68,.8]){g.fillRect(w*x,h*.7,w*.1,h*.14);g.fillRect(w*x,h*.65,w*.1,h*.08);}
  }
  // Simple, walk-up advisor portraits keep conversations available without WebGL.
  (npcRoster[room]||[]).forEach(npc=>{
    const distance=distanceTo(player,npc),scale=Math.max(.72,Math.min(1.35,1.35-distance*.08));
    const x=w/2+(npc.x-player.x)*w*.105*scale,y=h*.69+(npc.z-player.z)*h*.027;
    if(x<-45||x>w+45||y<h*.28||y>h*.88)return;
    const bodyH=48*scale,head=7*scale;
    g.fillStyle='#0005';g.beginPath();g.ellipse(x,y+3,11*scale,4*scale,0,0,Math.PI*2);g.fill();
    g.fillStyle=npc.color;g.beginPath();g.roundRect(x-9*scale,y-bodyH*.62,18*scale,bodyH*.56,5*scale);g.fill();
    g.fillStyle='#bc9278';g.beginPath();g.arc(x,y-bodyH*.76,head,0,Math.PI*2);g.fill();
    if(npc===nearbyNpc){g.strokeStyle='#e6ce93';g.lineWidth=2;g.beginPath();g.arc(x,y-bodyH*.45,bodyH*.48,0,Math.PI*2);g.stroke();g.fillStyle='#172633dd';g.fillRect(x-58,y-bodyH-20,116,17);g.fillStyle='#fff';g.font='bold 10px sans-serif';g.textAlign='center';g.fillText(npc.name,x,y-bodyH-8);g.textAlign='start';}
  });
  g.fillStyle='#172633';g.fillRect(w*.02,h*.035,w*.105,22);g.fillStyle='#f0e9dc';g.font='9px sans-serif';g.fillText('● LIVE FEED',w*.035,h*.059);g.fillStyle='#ffffff';g.font='bold 11px sans-serif';g.fillText(room==='war'?'SITUATION ROOM':room==='press'?'THE PRESS ROOM':'THE OVAL OFFICE',w*.04,h*.95);
}
$('modal').addEventListener('click',e=>{if(e.target.id==='menu-log'){openLog();}if(e.target.id==='menu-reset'){openModal(`<button class="modal-close" aria-label="Close">×</button><div class="eyebrow">A FRESH START</div><h2>Begin a new presidency?</h2><p>Your current save will be replaced. This cannot be undone.</p><div class="modal-actions"><button id="confirm-reset">Start over</button><button class="secondary modal-close">Keep playing</button></div>`);}if(e.target.id==='confirm-reset'){localStorage.removeItem('theOvalSave');game={...initial,history:[...initial.history],log:[]};save();closeModal();render();createRoom(game.room);}});
