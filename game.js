(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
const $=id=>document.getElementById(id);
const map=[
'####################','#........#.........#','#........#.........#','#..................#','#..##......##......#','#..##..............#','#..................#','#.....####.........#','#.....#..#.........#','#.....#..#.........#','#..................#','#..........##......#','#..................#','####################'];
const W=map[0].length,H=map.length,FOV=Math.PI/3,TAU=Math.PI*2;
let cw=960,ch=540,scale=1,zbuffer=[],last=0,elapsed=0,playing=false,paused=false,finished=false;
const player={x:3.3,y:2.5,a:0,health:100,ammo:30,reserve:180,kills:0,wave:1};
let enemies=[],spawnQueue=[],spawnTimer=0,waveBreak=0,reloading=0,fireCooldown=0,muzzle=0,damageFlash=0,shake=0;
let keys={},pointerDown=false,touchLook=null,stickVector={x:0,y:0},stickTouch=null,moveSpeed=0;
const spawnPoints=[{x:16.5,y:2.5},{x:17.2,y:5.5},{x:14.5,y:10.4},{x:9.5,y:5.5},{x:3.6,y:10.5},{x:16.5,y:11.5},{x:2.5,y:6.5},{x:11.5,y:2.5},{x:6.5,y:11.5}];
let lastFrame=performance.now();
function resize(){const dpr=Math.min(devicePixelRatio||1,1.6);cw=Math.min(1280,Math.floor(innerWidth*dpr));ch=Math.floor(cw/(innerWidth/innerHeight));if(ch>900){ch=900;cw=Math.floor(ch*innerWidth/innerHeight)}canvas.width=cw;canvas.height=ch;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.imageSmoothingEnabled=false;}
addEventListener('resize',resize);resize();
function wall(x,y){const ix=Math.floor(x),iy=Math.floor(y);return iy<0||iy>=H||ix<0||ix>=W||map[iy][ix]==='#'}
function normalize(a){while(a>Math.PI)a-=TAU;while(a< -Math.PI)a+=TAU;return a}
function cast(angle){const dx=Math.cos(angle),dy=Math.sin(angle);let mx=Math.floor(player.x),my=Math.floor(player.y);const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9));const sx=dx<0?-1:1,sy=dy<0?-1:1;let sideX=(dx<0?player.x-mx:mx+1-player.x)*ddx,sideY=(dy<0?player.y-my:my+1-player.y)*ddy,side=0,steps=0;while(steps++<45){if(sideX<sideY){sideX+=ddx;mx+=sx;side=0}else{sideY+=ddy;my+=sy;side=1}if(my<0||my>=H||mx<0||mx>=W||map[my][mx]==='#')break}let d=side===0?sideX-ddx:sideY-ddy;d=Math.max(.08,d);let hit=side===0?player.y+d*dy:player.x+d*dx;return{d,side,wallX:hit-Math.floor(hit),mx,my,dx,dy}}
function drawWorld(){
 const horizon=ch*.465;
 let sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#1b2728');sky.addColorStop(.64,'#3b4540');sky.addColorStop(1,'#73766a');ctx.fillStyle=sky;ctx.fillRect(0,0,cw,horizon);
 // Distant industrial glow and silhouette
 const glow=ctx.createRadialGradient(cw*.72,horizon*.7,2,cw*.72,horizon*.7,cw*.33);glow.addColorStop(0,'rgba(226,148,82,.24)');glow.addColorStop(1,'rgba(226,148,82,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,cw,horizon);
 ctx.fillStyle='#252d2a';ctx.beginPath();ctx.moveTo(0,horizon*.81);for(let x=0;x<=cw;x+=cw/12){let yy=horizon*(.74+Math.sin(x*.021)*.018+Math.cos(x*.009)*.025);ctx.lineTo(x,yy);ctx.lineTo(x,yy+22)}ctx.lineTo(cw,horizon);ctx.lineTo(0,horizon);ctx.fill();
 // floor gradient
 const floor=ctx.createLinearGradient(0,horizon,0,ch);floor.addColorStop(0,'#52534a');floor.addColorStop(.22,'#363a34');floor.addColorStop(1,'#171e1d');ctx.fillStyle=floor;ctx.fillRect(0,horizon,cw,ch-horizon);
 // Perspective lines
 ctx.save();ctx.beginPath();ctx.rect(0,horizon,cw,ch-horizon);ctx.clip();ctx.strokeStyle='rgba(200,204,174,.105)';ctx.lineWidth=1;
 for(let i=-16;i<=16;i++){ctx.beginPath();ctx.moveTo(cw/2+i*3,horizon);ctx.lineTo(cw/2+i*cw*.095,ch);ctx.stroke()}
 for(let n=1;n<14;n++){const yy=horizon+(ch-horizon)*(n*n/169);ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(cw,yy);ctx.stroke()}
 ctx.restore();
 const cols=Math.ceil(cw/2);zbuffer.length=cols;
 for(let i=0;i<cols;i++){const sx=i*2+1,angle=player.a+Math.atan((sx-cw/2)/(cw*.5)*Math.tan(FOV/2));const hit=cast(angle),dist=hit.d*Math.cos(angle-player.a);zbuffer[i]=dist;const wallH=Math.min(ch*2,ch/(dist*1.05));let top=horizon-wallH*.53,bottom=top+wallH;
 const edge=hit.wallX<.035||hit.wallX>.965, seam=(Math.floor(hit.wallX*8)%2===0);let shade=Math.max(.22,1-dist/13)*(hit.side?.72:1);const variant=(hit.mx*7+hit.my*13)%3;const base=[[105,111,98],[110,105,90],[91,103,99]][variant];
 const grad=ctx.createLinearGradient(0,top,0,bottom);grad.addColorStop(0,`rgb(${base.map(v=>v*shade*.76|0).join(',')})`);grad.addColorStop(.48,`rgb(${base.map(v=>v*shade|0).join(',')})`);grad.addColorStop(1,`rgb(${base.map(v=>v*shade*.56|0).join(',')})`);ctx.fillStyle=grad;ctx.fillRect(sx,top,2.5,wallH);
 if(edge){ctx.fillStyle=`rgba(15,22,22,${.35+shade*.2})`;ctx.fillRect(sx,top,2,wallH)}
 // panel seams, conduit and occasional warning paint
 if(seam&&dist<12){ctx.fillStyle=`rgba(15,22,21,${.28*shade})`;ctx.fillRect(sx,top+wallH*.13,1,wallH*.72)}
 if(hit.wallX>.34&&hit.wallX<.39&&hit.my%3===0){ctx.fillStyle=`rgba(220,115,58,${.48*shade})`;ctx.fillRect(sx,top+wallH*.14,2,Math.max(3,wallH*.018))}
 if(hit.wallX>.65&&hit.wallX<.69&&hit.mx%4===0){ctx.fillStyle=`rgba(218,204,154,${.15*shade})`;ctx.fillRect(sx,top+wallH*.79,2,Math.max(2,wallH*.012))}
 }
 // subtle ground debris / floor glints
 ctx.save();ctx.globalAlpha=.19;for(let j=0;j<20;j++){const x=((j*197+Math.floor(player.x*32))%cw),y=horizon+(ch-horizon)*((j%9+1)/10);ctx.fillStyle=j%3?'#a1a28b':'#d18a58';ctx.fillRect(x,y,2+(j%4),1)}ctx.restore();
}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function drawBot(e){const rel=normalize(Math.atan2(e.y-player.y,e.x-player.x)-player.a),dist=Math.hypot(e.x-player.x,e.y-player.y);if(Math.abs(rel)>FOV*.72||dist<.25)return;const sx=cw/2+Math.tan(rel)/Math.tan(FOV/2)*cw/2,bi=Math.max(0,Math.min(zbuffer.length-1,Math.floor(sx/2)));if(dist>zbuffer[bi]+.2)return;
 const s=ch/(dist*1.18),baseY=ch*.465+s*.49,bodyW=s*.38,bodyH=s*.56;const flash=e.hit>0;ctx.save();ctx.translate(sx,baseY);ctx.globalAlpha=Math.min(1,3/dist);const bob=Math.sin(elapsed*5+e.phase)*s*.012;ctx.translate(0,bob);
 // cast shadow
 ctx.fillStyle='rgba(7,11,10,.5)';ctx.beginPath();ctx.ellipse(0,0,bodyW*.72,s*.08,0,0,TAU);ctx.fill();
 const metal=flash?'#e4d6b3':'#59635f',dark=flash?'#fff0ce':'#293331',light=flash?'#fff':'#89918a',orange='#d96c42';
 // legs with angular plates
 ctx.strokeStyle='#1b2423';ctx.lineWidth=Math.max(2,s*.085);ctx.lineCap='square';ctx.beginPath();ctx.moveTo(-bodyW*.28,-bodyH*.05);ctx.lineTo(-bodyW*.32,-bodyH*.62);ctx.moveTo(bodyW*.28,-bodyH*.05);ctx.lineTo(bodyW*.32,-bodyH*.62);ctx.stroke();
 poly([[-bodyW*.49,-bodyH*.04],[-bodyW*.2,-bodyH*.04],[-bodyW*.18,-bodyH*.25],[-bodyW*.42,-bodyH*.3]],dark);poly([[bodyW*.2,-bodyH*.04],[bodyW*.49,-bodyH*.04],[bodyW*.42,-bodyH*.3],[bodyW*.18,-bodyH*.25]],dark);
 poly([[-bodyW*.55,-bodyH*.04],[-bodyW*.12,-bodyH*.04],[-bodyW*.17,-bodyH*.17],[-bodyW*.48,-bodyH*.17]],metal);poly([[bodyW*.12,-bodyH*.04],[bodyW*.55,-bodyH*.04],[bodyW*.48,-bodyH*.17],[bodyW*.17,-bodyH*.17]],metal);
 // arms and shoulder pods
 ctx.strokeStyle=dark;ctx.lineWidth=Math.max(3,s*.12);ctx.beginPath();ctx.moveTo(-bodyW*.39,-bodyH*.81);ctx.lineTo(-bodyW*.65,-bodyH*.48);ctx.moveTo(bodyW*.39,-bodyH*.81);ctx.lineTo(bodyW*.62,-bodyH*.48);ctx.stroke();
 poly([[-bodyW*.65,-bodyH*.59],[-bodyW*.45,-bodyH*.82],[-bodyW*.31,-bodyH*.75],[-bodyW*.4,-bodyH*.55]],metal);poly([[bodyW*.65,-bodyH*.59],[bodyW*.45,-bodyH*.82],[bodyW*.31,-bodyH*.75],[bodyW*.4,-bodyH*.55]],metal);
 // torso armor
 poly([[-bodyW*.4,-bodyH*.83],[-bodyW*.28,-bodyH*.98],[bodyW*.27,-bodyH*.98],[bodyW*.4,-bodyH*.82],[bodyW*.31,-bodyH*.38],[0,-bodyH*.3],[-bodyW*.32,-bodyH*.39]],metal,'rgba(8,13,13,.75)');
 poly([[-bodyW*.29,-bodyH*.91],[bodyW*.29,-bodyH*.91],[bodyW*.24,-bodyH*.7],[-bodyW*.24,-bodyH*.7]],'#414b47');poly([[-bodyW*.12,-bodyH*.63],[bodyW*.12,-bodyH*.63],[bodyW*.16,-bodyH*.45],[-bodyW*.16,-bodyH*.45]],dark);
 ctx.fillStyle=orange;ctx.fillRect(-bodyW*.25,-bodyH*.73,bodyW*.5,Math.max(2,bodyH*.028));
 // neck, head and sensor
 ctx.fillStyle=dark;ctx.fillRect(-bodyW*.13,-bodyH*1.04,bodyW*.26,bodyH*.13);
 poly([[-bodyW*.28,-bodyH*1.09],[-bodyW*.2,-bodyH*1.28],[bodyW*.18,-bodyH*1.28],[bodyW*.28,-bodyH*1.11],[bodyW*.19,-bodyH*.99],[-bodyW*.2,-bodyH*.99]],'#707a72','rgba(10,15,14,.9)');
 poly([[-bodyW*.18,-bodyH*1.22],[bodyW*.18,-bodyH*1.22],[bodyW*.14,-bodyH*1.11],[-bodyW*.14,-bodyH*1.11]],'#202a29');ctx.fillStyle=flash?'#fff':'#f18a4a';ctx.shadowColor='#f07845';ctx.shadowBlur=s*.08;ctx.fillRect(-bodyW*.12,-bodyH*1.19,bodyW*.24,Math.max(2,bodyH*.035));ctx.shadowBlur=0;
 // panel rivets
 ctx.fillStyle='#bac1ad';for(let i=-1;i<=1;i+=2)ctx.fillRect(i*bodyW*.28,-bodyH*.84,Math.max(1,s*.012),Math.max(1,s*.012));
 if(e.hp<2){ctx.strokeStyle='rgba(240,120,69,.85)';ctx.lineWidth=Math.max(1,s*.012);ctx.beginPath();ctx.moveTo(-bodyW*.09,-bodyH*1.28);ctx.lineTo(bodyW*.04,-bodyH*1.03);ctx.stroke()}
 ctx.restore();
}
function drawGun(dt){const kick=muzzle>0?muzzle*ch*.075:0;const sway=Math.sin(elapsed*7)*moveSpeed*ch*.009;const x=cw*.72+sway,y=ch+ch*.13-kick;ctx.save();ctx.translate(x,y);ctx.scale(ch/540,ch/540);
 // shadow / receiver stock
 poly([[-92,-12],[-54,-44],[-11,-49],[25,-28],[43,24],[-17,48],[-72,20]],'rgba(6,10,10,.6)');
 poly([[-77,-32],[-49,-47],[-23,-39],[-17,-15],[-47,-5],[-77,-16]],'#353f3d');poly([[-88,-30],[-72,-38],[-63,-17],[-80,-7]],'#758078');
 // handguard and receiver angular
 poly([[-50,-42],[51,-39],[68,-18],[43,16],[-24,14],[-50,-8]],'#58625c','#202927');poly([[-46,-38],[31,-36],[43,-23],[-36,-19]],'#7e887d');poly([[-19,-19],[45,-21],[48,6],[-15,12]],'#303a37');
 // orange marking, rails, screws
 ctx.fillStyle='#e07b4a';ctx.fillRect(-2,-30,18,3);ctx.fillStyle='#a5afa0';for(let i=0;i<5;i++)ctx.fillRect(-42+i*14,-40,6,2);
 // barrel and muzzle
 poly([[42,-27],[110,-25],[119,-17],[115,-8],[43,-9]],'#3a4440');ctx.fillStyle='#171e1d';ctx.fillRect(107,-25,14,15);ctx.fillStyle='#7d8880';ctx.fillRect(47,-28,4,20);
 // optic
 poly([[-2,-44],[0,-61],[30,-62],[34,-42]],'#202826');poly([[5,-58],[25,-58],[24,-47],[5,-47]],'#8da89c');ctx.fillStyle='rgba(200,241,106,.55)';ctx.fillRect(9,-55,13,2);
 // grip and magazine
 poly([[2,7],[30,4],[25,44],[13,50],[-2,21]],'#28312e');poly([[-12,12],[13,13],[10,56],[-1,62],[-13,36]],'#414b46');ctx.fillStyle='#242d2a';for(let i=0;i<4;i++)ctx.fillRect(-9,23+i*7,16,2);
 // supporting glove
 poly([[-52,-3],[-27,-10],[-5,2],[-11,24],[-39,20],[-59,10]],'#26302d');poly([[-50,-3],[-30,-8],[-18,1],[-28,8],[-50,6]],'#58645d');
 if(muzzle>0){ctx.globalAlpha=Math.min(1,muzzle*4);ctx.fillStyle='#ffe1a0';ctx.shadowColor='#ff9b4a';ctx.shadowBlur=35;poly([[118,-20],[153,-9],[124,-2],[149,9],[116,1]],'#ffe0a0');ctx.shadowBlur=0;ctx.globalAlpha=1}
 ctx.restore();
}
function draw(){if(!cw||!ch)return;ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawWorld();enemies.slice().sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y)).forEach(drawBot);drawGun(0);ctx.restore();if(damageFlash>0){ctx.fillStyle=`rgba(203,55,38,${damageFlash*.14})`;ctx.fillRect(0,0,cw,ch)} }
function distanceTo(x,y,angle){const d=Math.hypot(x-player.x,y-player.y),a=Math.atan2(y-player.y,x-player.x);return{d,a,diff:Math.abs(normalize(a-angle))}}
function spawnEnemy(){let candidates=spawnPoints.filter(p=>!wall(p.x,p.y)&&Math.hypot(p.x-player.x,p.y-player.y)>4&&enemies.every(e=>Math.hypot(e.x-p.x,e.y-p.y)>1));if(!candidates.length)candidates=spawnPoints.filter(p=>Math.hypot(p.x-player.x,p.y-player.y)>3);const p=candidates[Math.floor(Math.random()*candidates.length)];if(p)enemies.push({x:p.x,y:p.y,hp:2,hit:0,attack:1+Math.random(),phase:Math.random()*10,speed:.48+Math.random()*.14,dead:false})}
function startWave(n){player.wave=n;spawnQueue=Array.from({length:3+n*2},(_,i)=>i);spawnTimer=.45;waveBreak=0;$('wave').textContent=String(n).padStart(2,'0');$('directive').textContent=`Wave ${n} // neutralize incoming hostiles.`;showNotice(n===1?'HOSTILES INBOUND':`THREAT LEVEL ${n} // INCOMING`);updateHud()}
function showNotice(text){const el=$('notice');el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show')}
function updateHud(){ $('health-value').textContent=Math.ceil(player.health);$('health-bar').style.width=Math.max(0,player.health)+'%';$('health-bar').style.background=player.health<35?'#f07845':'#c8f16a';$('health-caption').textContent=player.health<35?'CRITICAL // SEEK COVER':player.health<65?'DAMAGE SUSTAINED':'COMBAT READY';$('ammo').textContent=String(player.ammo).padStart(2,'0');$('reserve').textContent=String(player.reserve).padStart(3,'0');$('hostiles').textContent=String(enemies.length+spawnQueue.length).padStart(2,'0');$('wave-progress').style.width=`${((player.wave-1)/5)*100}%`;}
function begin(){if(playing)return;playing=true;paused=false;finished=false;elapsed=0;last=performance.now();player.x=3.3;player.y=2.5;player.a=0;player.health=100;player.ammo=30;player.reserve=180;player.kills=0;player.shots=0;player.hits=0;enemies=[];reloading=0;fireCooldown=0;$('overlay').classList.add('hidden');$('pause-panel').classList.remove('open');$('end-panel').classList.remove('open');$('mobile-controls').style.display='';startWave(1);if(matchMedia('(pointer:fine)').matches&&canvas.requestPointerLock)canvas.requestPointerLock()}
function endGame(win){playing=false;finished=true;paused=false;if(document.pointerLockElement)document.exitPointerLock();$('mobile-controls').style.display='none';$('end-kicker').textContent=win?'MISSION COMPLETE':'MISSION FAILED';$('end-title').innerHTML=win?'YARD<br><em>SECURED.</em>':'SIGNAL<br><em>LOST.</em>';$('end-copy').textContent=win?'The depot is quiet. For now.':'Your signal went dark. The yard is still theirs.';$('final-kills').textContent=String(player.kills).padStart(2,'0');$('final-time').textContent=formatTime(elapsed);$('final-accuracy').textContent=(player.shots?Math.round(player.hits/player.shots*100):100)+'%';$('end-panel').classList.add('open')}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0')}
function pause(){if(!playing)return;paused=!paused;$('pause-panel').classList.toggle('open',paused);if(paused&&document.pointerLockElement)document.exitPointerLock();else if(!paused&&matchMedia('(pointer:fine)').matches)canvas.requestPointerLock?.();lastFrame=performance.now()}
function reload(){if(!playing||paused||reloading||player.ammo===30||player.reserve<=0)return;reloading=1.25;$('reload-state').textContent='RELOADING';}
function shoot(){if(!playing||paused||reloading||fireCooldown>0)return;if(player.ammo<=0){reload();return}player.ammo--;player.shots=(player.shots||0)+1;fireCooldown=.105;muzzle=.12;shake=3.2;let target=null,best=.095;
 for(const e of enemies){const d=distanceTo(e.x,e.y,player.a);if(d.d>9||d.diff>best)continue;const wallDist=cast(d.a).d;if(wallDist<d.d-.25)continue;best=d.diff;target=e}
 if(target){target.hp--;target.hit=.12;player.hits=(player.hits||0)+1;const marker=$('hit-marker');marker.classList.remove('show');void marker.offsetWidth;marker.classList.add('show');if(target.hp<=0){target.dead=true;player.kills++;enemies=enemies.filter(e=>e!==target);updateHud()}}
 updateHud()}
player.shots=0;player.hits=0;
function update(dt){if(!playing||paused)return;elapsed+=dt;fireCooldown=Math.max(0,fireCooldown-dt);muzzle=Math.max(0,muzzle-dt);shake=Math.max(0,shake-dt*18);damageFlash=Math.max(0,damageFlash-dt*2.7);if(reloading>0){reloading-=dt;if(reloading<=0){const load=Math.min(30-player.ammo,player.reserve);player.ammo+=load;player.reserve-=load;$('reload-state').textContent='';updateHud()}}
 let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)+(-stickVector.y),s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+stickVector.x;let turn=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0);player.a=normalize(player.a+turn*dt*2.2);if(f||s){const m=Math.hypot(f,s);f/=m;s/=m;const nx=player.x+(Math.cos(player.a)*f-Math.sin(player.a)*s)*dt*2.45,ny=player.y+(Math.sin(player.a)*f+Math.cos(player.a)*s)*dt*2.45;if(!wall(nx+Math.sign(nx-player.x)*.18,player.y))player.x=nx;if(!wall(player.x,ny+Math.sign(ny-player.y)*.18))player.y=ny;moveSpeed=Math.min(1,moveSpeed+dt*5)}else moveSpeed=Math.max(0,moveSpeed-dt*5);
 if(pointerDown&&matchMedia('(pointer:fine)').matches)shoot();
 if(spawnQueue.length){spawnTimer-=dt;if(spawnTimer<=0){spawnEnemy();spawnQueue.pop();spawnTimer=.8+Math.random()*.48;updateHud()}}
 if(!spawnQueue.length&&!enemies.length){if(waveBreak===0){waveBreak=3;showNotice(player.wave<5?'SECTOR CLEAR':'YARD SECURED');$('directive').textContent='Sector clear // stand by for next wave.'}else{waveBreak-=dt;if(waveBreak<=0){if(player.wave>=5){endGame(true);return}startWave(player.wave+1)}}}
 for(const e of enemies){e.hit=Math.max(0,e.hit-dt);e.attack-=dt;const d=Math.hypot(player.x-e.x,player.y-e.y);if(d>1.18){const vx=(player.x-e.x)/d*e.speed*dt,vy=(player.y-e.y)/d*e.speed*dt;if(!wall(e.x+vx,e.y))e.x+=vx;if(!wall(e.x,e.y+vy))e.y+=vy}else if(e.attack<=0){player.health=Math.max(0,player.health-8);damageFlash=.9;shake=5;e.attack=1.1+Math.random()*.35;updateHud();if(player.health<=0){endGame(false);return}}}
 updateHud();$('clock').textContent=formatTime(elapsed);
}
function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;update(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
$('start').addEventListener('click',begin);$('resume').addEventListener('click',()=>pause());$('restart').addEventListener('click',begin);$('again').addEventListener('click',begin);
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyR')reload();if(e.code==='Escape'&&playing)pause()});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{pointerDown=false;keys={};if(playing&&!paused)pause()});
canvas.addEventListener('click',()=>{if(playing&&matchMedia('(pointer:fine)').matches&&!document.pointerLockElement)canvas.requestPointerLock?.()});document.addEventListener('mousemove',e=>{if(playing&&!paused&&document.pointerLockElement===canvas)player.a=normalize(player.a+e.movementX*.0022)});
canvas.addEventListener('pointerdown',e=>{if(!playing||paused)return;if(e.pointerType==='mouse'){pointerDown=true;shoot()}else{touchLook=e.clientX;}});addEventListener('pointerup',e=>{if(e.pointerType==='mouse')pointerDown=false;else touchLook=null});canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'&&touchLook!==null&&playing){player.a=normalize(player.a+(e.clientX-touchLook)*.007);touchLook=e.clientX}});
const zone=$('stick-zone'),stick=$('stick');zone.addEventListener('pointerdown',e=>{e.preventDefault();stickTouch=e.pointerId;zone.setPointerCapture(e.pointerId);moveStick(e)});zone.addEventListener('pointermove',e=>{if(e.pointerId===stickTouch)moveStick(e)});function moveStick(e){const r=zone.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy),max=39,m=Math.min(max,d);stick.style.transform=`translate(${d?dx/d*m:0}px,${d?dy/d*m:0}px)`;stickVector={x:d?dx/d*(m/max):0,y:d?dy/d*(m/max):0}}
function releaseStick(e){if(e.pointerId===stickTouch){stickTouch=null;stickVector={x:0,y:0};stick.style.transform='translate(0,0)'}}zone.addEventListener('pointerup',releaseStick);zone.addEventListener('pointercancel',releaseStick);
$('mobile-fire').addEventListener('pointerdown',e=>{e.preventDefault();pointerDown=true;shoot()});$('mobile-fire').addEventListener('pointerup',()=>pointerDown=false);$('mobile-fire').addEventListener('pointercancel',()=>pointerDown=false);$('mobile-reload').addEventListener('pointerdown',e=>{e.preventDefault();reload()});
})();
