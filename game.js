import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const hud = {
  status: document.getElementById('status-text'),
  objective: document.getElementById('objective-text'),
  health: document.getElementById('health-value'),
  relays: document.getElementById('relay-value'),
  story: document.getElementById('story-text'),
  overlay: document.getElementById('message-overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayCopy: document.getElementById('overlay-copy'),
  restart: document.getElementById('restart-btn'),
  cutscene: document.getElementById('cutscene-overlay'),
  cutsceneKicker: document.getElementById('cutscene-kicker'),
  cutsceneTitle: document.getElementById('cutscene-title'),
  cutsceneCopy: document.getElementById('cutscene-copy'),
  cutsceneProgress: document.getElementById('cutscene-progress'),
  cutsceneContinue: document.getElementById('continue-cutscene'),
  cutsceneSkip: document.getElementById('skip-cutscene')
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b12);
scene.fog = new THREE.Fog(0x050b12, 18, 42);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';

const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const sound = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        return;
      }
      this.ctx = new AudioCtor();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playTone({ freq = 440, duration = 0.12, type = 'sine', volume = 0.04, sweep = 0, detune = 0 } = {}) {
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, t);
    if (sweep !== 0) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, freq + sweep), t + duration);
    }
    if (detune !== 0) {
      oscillator.detune.setValueAtTime(detune, t);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    oscillator.connect(gain);
    gain.connect(this.ctx.destination);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.02);
  },
  pulse() {
    this.playTone({ freq: 250, duration: 0.08, type: 'square', volume: 0.045, sweep: 90 });
  },
  hit() {
    this.playTone({ freq: 120, duration: 0.09, type: 'sawtooth', volume: 0.055, sweep: -80 });
  },
  relay() {
    this.playTone({ freq: 720, duration: 0.18, type: 'triangle', volume: 0.06, sweep: 180 });
    this.playTone({ freq: 500, duration: 0.14, type: 'triangle', volume: 0.04, sweep: 110, detune: 6 });
  },
  success() {
    this.playTone({ freq: 540, duration: 0.12, type: 'triangle', volume: 0.06, sweep: 160 });
    this.playTone({ freq: 760, duration: 0.2, type: 'square', volume: 0.05, sweep: 190 });
  },
  fail() {
    this.playTone({ freq: 90, duration: 0.28, type: 'sawtooth', volume: 0.08, sweep: -60 });
  }
};

const game = {
  health: 100,
  victory: false,
  relayCount: 0,
  joined: false,
  currentObjective: 'Find the first relay',
  objectiveIndex: 0,
  lastShotAt: 0,
  lastDamageAt: 0,
  messageTimer: 0,
  time: 0,
  enemies: [],
  relays: [],
  checkpoints: [],
  sparkies: [],
  particles: [],
  cutsceneActive: false,
  cutsceneQueue: [],
  cutsceneDone: null,
  core: null
};

const touch = { moveX: 0, moveY: 0, movePointer: null, lookPointer: null, lookX: 0, lookY: 0 };

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  fire: false
};

const player = {
  yaw: 0.5,
  pitch: -0.18,
  position: new THREE.Vector3(0, 1.8, 14),
  velocity: new THREE.Vector3(),
  speed: 10,
  bob: 0,
  height: 1.8,
  muzzle: new THREE.Vector3(),
  radius: 1.1,
  fireCooldown: 0,
  invuln: 0
};

const nav = {
  center: new THREE.Vector3(0, 0, 0),
  areas: []
};

function makeGround() {
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 30, 2, 64),
    new THREE.MeshStandardMaterial({
      color: 0x111b29,
      roughness: 0.96,
      metalness: 0.24,
      emissive: 0x091720,
      emissiveIntensity: 0.4
    })
  );
  ground.position.y = -1.1;
  world.add(ground);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(18.5, 0.28, 16, 120),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x7fe7ff,
      emissiveIntensity: 0.9,
      metalness: 0.7,
      roughness: 0.2
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.1;
  world.add(ring);

  const dust = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: 0x9ec7ff,
      size: 0.12,
      transparent: true,
      opacity: 0.8
    })
  );
  const points = [];
  for (let i = 0; i < 500; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 25;
    points.push(
      (Math.cos(angle) * r),
      0.5 + Math.random() * 5,
      (Math.sin(angle) * r)
    );
  }
  dust.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  world.add(dust);
}

function makeSkyline() {
  const total = 34;
  for (let i = 0; i < total; i++) {
    const h = 3 + Math.random() * 12;
    const w = 1.5 + Math.random() * 3.5;
    const d = 1.8 + Math.random() * 2.8;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x1b2c3b : 0x12202a,
        roughness: 0.9,
        metalness: 0.3,
        emissive: i % 3 === 0 ? 0x091d22 : 0x000000,
        emissiveIntensity: 0.25
      })
    );
    const angle = (i / total) * Math.PI * 2 + Math.random() * 0.6;
    const radius = 18 + Math.random() * 12;
    mesh.position.set(Math.cos(angle) * radius, h / 2 - 1, Math.sin(angle) * radius);
    world.add(mesh);
  }

  for (let i = 0; i < 12; i++) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x7fe7ff,
        emissiveIntensity: 2.8,
        roughness: 0.25,
        metalness: 0.6
      })
    );
    const angle = (i / 12) * Math.PI * 2;
    light.position.set(Math.cos(angle) * (22 + (i % 2)), 6 + (i % 3), Math.sin(angle) * (22 + (i % 2)));
    world.add(light);
  }
}

function addLight() {
  const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x09141d, 1.5);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(7, 15, 8);
  scene.add(dir);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeRelay(position) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.2, 2.2, 18),
    new THREE.MeshStandardMaterial({
      color: 0xdff8ff,
      emissive: 0x4ad6ff,
      emissiveIntensity: 1,
      metalness: 0.7,
      roughness: 0.28
    })
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.12, 12, 48),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x7fe7ff,
      emissiveIntensity: 2,
      metalness: 0.7,
      roughness: 0.25
    })
  );
  ring.rotation.x = Math.PI / 2;
  core.position.y = 1.1;
  group.add(core, ring);
  group.position.copy(position);
  world.add(group);
  return { group, active: true, radius: 2.2, position: position.clone() };
}

function makeCore(position) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.5, 0.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x26394a, metalness: 0.8, roughness: 0.3 })
  );
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.9, 2.8, 16),
    new THREE.MeshStandardMaterial({
      color: 0x83a4b8,
      emissive: 0x16465b,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.24
    })
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.12, 12, 40),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 1.4 })
  );
  base.position.y = 0.3;
  column.position.y = 1.8;
  halo.position.y = 2.5;
  halo.rotation.x = Math.PI / 2;
  group.add(base, column, halo);
  group.position.copy(position);
  world.add(group);
  return { group, position: position.clone() };
}

function makeEnemy(position, color = 0xff5d5d) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.3, 1.7),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      metalness: 0.65,
      roughness: 0.35
    })
  );
  body.position.y = 1.1;
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 })
  );
  eye.position.set(0.34, 1.2, 0.7);
  const eye2 = eye.clone();
  eye2.position.x = -0.34;
  group.add(body, eye, eye2);
  group.position.copy(position);
  world.add(group);
  return {
    group,
    radius: 1.35,
    hp: 1,
    speed: rand(2.3, 3.5),
    drift: rand(0, Math.PI * 2),
    shootTimer: rand(1, 3)
  };
}

function makeCheckpoint(position) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.25, 22),
    new THREE.MeshStandardMaterial({
      color: 0x8dc7ff,
      emissive: 0x7fe7ff,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2
    })
  );
  mesh.position.copy(position);
  mesh.position.y = 0.2;
  world.add(mesh);
  return { mesh, position: position.clone() };
}

function createParticles(position, color = 0x7fe7ff) {
  const p = [];
  for (let i = 0; i < 12; i++) {
    const particle = {
      velocity: new THREE.Vector3(rand(-1.5, 1.5), rand(-1, 1.5), rand(-1.5, 1.5)),
      position: position.clone(),
      color,
      life: rand(0.2, 0.8),
      size: rand(0.06, 0.16)
    };
    p.push(particle);
  }
  game.particles.push(...p);
}

function createMuzzleFlash(position, direction) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.15, 1.2, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffe7a3,
      emissive: 0xffd579,
      emissiveIntensity: 2.5,
      metalness: 0.2,
      roughness: 0.2
    })
  );
  beam.position.copy(position.clone().add(direction.clone().multiplyScalar(0.8)));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  world.add(beam);
  game.sparkies.push({ mesh: beam, life: 0.08 });
}

function setupLevel() {
  makeGround();
  makeSkyline();
  addLight();

  const relayLocations = [
    new THREE.Vector3(-10, 0, -4),
    new THREE.Vector3(10, 0, -10),
    new THREE.Vector3(0, 0, 7)
  ];

  relayLocations.forEach((pos) => {
    game.relays.push(makeRelay(pos));
  });
  game.core = makeCore(new THREE.Vector3(0, 0, 0));

  const checkpointLocations = [
    new THREE.Vector3(-12, 0, 10),
    new THREE.Vector3(8, 0, 3),
    new THREE.Vector3(-2, 0, -15)
  ];
  checkpointLocations.forEach((pos) => {
    game.checkpoints.push(makeCheckpoint(pos));
  });

  const enemySpawns = [
    new THREE.Vector3(-8, 0, 10),
    new THREE.Vector3(12, 0, 9),
    new THREE.Vector3(-13, 0, -8),
    new THREE.Vector3(13, 0, -18),
    new THREE.Vector3(0, 0, -4)
  ];
  enemySpawns.forEach((pos) => {
    game.enemies.push(makeEnemy(pos, 0xff5d5d));
  });

  nav.areas = [
    { center: new THREE.Vector3(-12, 0, 10), radius: 7 },
    { center: new THREE.Vector3(12, 0, -12), radius: 8 },
    { center: new THREE.Vector3(0, 0, 14), radius: 7 }
  ];
}

function updateHud() {
  hud.status.textContent = game.victory ? 'Mission complete' : (game.health > 0 ? 'Drone contact detected' : 'Core offline');
  hud.objective.textContent = game.currentObjective;
  hud.health.textContent = `${Math.max(0, Math.round(game.health))}%`;
  hud.relays.textContent = `${game.relayCount}/${game.relays.length}`;
}

function updateStory(text) {
  hud.story.textContent = text;
}

function showOverlay(title, copy) {
  hud.overlayTitle.textContent = title;
  hud.overlayCopy.textContent = copy;
  hud.overlay.classList.remove('hidden');
}

function hideOverlay() {
  hud.overlay.classList.add('hidden');
}

function renderCutscene() {
  const sceneData = game.cutsceneQueue[0];
  if (!sceneData) {
    game.cutsceneActive = false;
    document.body.classList.remove('cutscene-playing');
    hud.cutscene.classList.add('hidden');
    const done = game.cutsceneDone;
    game.cutsceneDone = null;
    if (done) done();
    return;
  }
  hud.cutsceneKicker.textContent = sceneData.kicker;
  hud.cutsceneTitle.textContent = sceneData.title;
  hud.cutsceneCopy.textContent = sceneData.copy;
  hud.cutsceneProgress.textContent = sceneData.progress || 'IRON RECLAIMER  •  FIELD RECORDING';
  hud.cutsceneContinue.textContent = sceneData.button || 'Continue →';
  game.cutsceneActive = true;
  document.body.classList.add('cutscene-playing');
  hud.cutscene.classList.remove('hidden');
}

function playCutscene(sceneData, done) {
  game.cutsceneQueue = Array.isArray(sceneData) ? [...sceneData] : [sceneData];
  game.cutsceneDone = done || null;
  renderCutscene();
}

function advanceCutscene(skip = false) {
  if (!game.cutsceneActive) return;
  if (skip) game.cutsceneQueue = [];
  else game.cutsceneQueue.shift();
  renderCutscene();
}

function setObjective(text, idx) {
  game.currentObjective = text;
  game.objectiveIndex = idx;
  updateHud();
}

function beginMission() {
  updateStory('A faint distress beacon repeats beneath the storm.');
  setObjective('Listen to the field recording', 0);
  playCutscene({
    kicker: 'PROLOGUE  /  04:17 BEFORE SILENCE',
    title: 'A signal in the dust',
    copy: 'The mining moon of Khepri has gone dark. Three relay towers keep its evacuation beacon alive, but the station’s defense drones have mistaken every survivor for a threat. You are R-04, the last repair unit still answering the call.',
    progress: 'CHAPTER 1  •  THE LAST SIGNAL',
    button: 'Begin mission →'
  }, () => {
    sound.init();
    sound.pulse();
    updateStory('Restore all three relays, then restart the central beacon. The defense drones will hunt you across the station.');
    setObjective('Find and activate Relay One', 0);
  });
}

function getPointerDirection() {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(0, 0);
  raycaster.setFromCamera(pointer, camera);
  const dir = new THREE.Vector3();
  raycaster.ray.direction.clone().normalize();
  return raycaster.ray.direction.clone().normalize();
}

function fireWeapon() {
  if (game.cutsceneActive || game.health <= 0 || game.victory) return;
  const now = performance.now();
  if (now - game.lastShotAt < 180) {
    return;
  }
  game.lastShotAt = now;
  sound.init();
  sound.playTone({ freq: 620, duration: 0.06, type: 'square', volume: 0.04, sweep: 180 });

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const origin = player.position.clone().add(new THREE.Vector3(0, 0.35, 0));
  const end = origin.clone().add(forward.clone().multiplyScalar(18));

  let hitSomething = false;
  for (const enemy of game.enemies) {
    if (!enemy.hp) continue;
    const toEnemy = enemy.group.position.clone().sub(origin);
    const distance = toEnemy.length();
    if (distance < 15) {
      const projected = toEnemy.normalize();
      const dot = projected.dot(forward);
      if (dot > 0.7) {
        enemy.hp -= 1;
        createParticles(enemy.group.position.clone(), 0xff9f5d);
        createMuzzleFlash(origin, forward);
        if (enemy.hp <= 0) {
          enemy.group.visible = false;
          sound.playTone({ freq: 210, duration: 0.18, type: 'triangle', volume: 0.05, sweep: -120 });
          createParticles(enemy.group.position.clone(), 0xffd179);
        }
        hitSomething = true;
      }
    }
  }

  if (!hitSomething) {
    createMuzzleFlash(origin, forward);
  }

  if (game.relays.some((relay) => relay.active && relay.position.distanceTo(player.position) < 3.5)) {
    const relay = game.relays.find((r) => r.active && r.position.distanceTo(player.position) < 3.5);
    if (relay) {
      relay.group.rotation.y += 0.12;
    }
  }

  const beam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([origin, end]),
    new THREE.LineBasicMaterial({ color: 0xffe7a3, transparent: true, opacity: 0.7 })
  );
  world.add(beam);
  game.sparkies.push({ mesh: beam, life: 0.08 });
}

function damagePlayer(amount) {
  if (player.invuln > 0 || game.victory) {
    return;
  }
  game.health = Math.max(0, game.health - amount);
  player.invuln = 0.45;
  sound.init();
  sound.hit();
  if (game.health <= 0) {
    showOverlay('System Offline', 'The drones overran the relay station. Boot the mission again and try a safer route.');
    sound.fail();
    game.currentObjective = 'Mission failed';
    updateHud();
  }
}

function activateRelay(index) {
  const relay = game.relays[index];
  if (index !== game.relayCount || !relay || !relay.active || relay.position.distanceTo(player.position) > 4.5) return;

  relay.active = false;
  relay.group.visible = false;
  soundsForRelay();
  game.relayCount += 1;
  createParticles(relay.position.clone(), 0x7fe7ff);

  if (game.relayCount === 1) {
    setObjective('Reach and activate Relay Two', 1);
    updateStory('Relay One is stable. A fragment of the evacuation beacon comes through: the survivors are sheltering in the old transit vault.');
    playCutscene({
      kicker: 'CHAPTER 1  /  RELAY ONE ONLINE',
      title: 'Voices on the carrier wave',
      copy: '“R-04, if you can hear us, the vault doors are holding.” The message is weak but real. The first relay locks into place, and the beacon points deeper into the crater.',
      progress: 'FIELD RECORDING  01 / 03'
    });
  } else if (game.relayCount === 2) {
    setObjective('Reach and activate Relay Three', 2);
    updateStory('The second relay opens a route through the storm. The station’s old caretaker AI has been steering the drones toward the beacon.');
    playCutscene({
      kicker: 'CHAPTER 2  /  RELAY TWO ONLINE',
      title: 'The station wakes',
      copy: 'A caretaker’s voice breaks through the static: “I was protecting the colony.” Its corrupted defense network has sealed the core. One relay remains—the last link between the survivors and a safe route home.',
      progress: 'FIELD RECORDING  02 / 03'
    });
  } else {
    setObjective('Return to the central core and press USE', 3);
    updateStory('All three relays are aligned. Return to the central core and restart the evacuation beacon.');
    playCutscene({
      kicker: 'CHAPTER 3  /  ALL RELAYS ONLINE',
      title: 'One last command',
      copy: 'The storm thins. Beyond the sealed doors, hundreds of life-signs answer the beacon. The caretaker releases the core lock: “R-04… finish what I could not.” Return to the central platform and transmit the evacuation code.',
      progress: 'FINAL OBJECTIVE UNLOCKED',
      button: 'To the core →'
    });
  }
  updateHud();
}

function activateCore() {
  if (game.relayCount < game.relays.length || !game.core) return;
  if (game.core.position.distanceTo(player.position) > 4.5) return;
  updateStory('Core access granted. Transmitting evacuation code…');
  setObjective('Transmit the evacuation code', 4);
  soundsForRelay();
  playCutscene({
    kicker: 'EPILOGUE  /  BEACON RESTORED',
    title: 'The last light',
    copy: 'The central beacon ignites. Across Khepri, shelter doors open and the survivors answer one by one. The caretaker’s drones power down as R-04 sends the final shuttle coordinates into the night.',
    progress: 'MISSION COMPLETE',
    button: 'Finish →'
  }, () => {
    game.victory = true;
    updateStory('The evacuation beacon is live. The survivors are going home.');
    setObjective('Mission complete', 4);
    showOverlay('Mission Success', 'You restored the relays, brought the caretaker back from the edge, and guided Khepri’s survivors to safety.');
    sound.success();
  });
}

function interact() {
  if (game.cutsceneActive || game.health <= 0 || game.victory) return;
  const nextRelay = game.relays[game.relayCount];
  if (nextRelay && nextRelay.active && nextRelay.position.distanceTo(player.position) <= 4.5) {
    activateRelay(game.relayCount);
    return;
  }
  if (game.relayCount === game.relays.length && game.core && game.core.position.distanceTo(player.position) <= 4.5) {
    activateCore();
  }
}

function soundsForRelay() {
  sound.init();
  sound.relay();
}

function updateRelays() {
  for (let i = 0; i < game.relays.length; i++) {
    const relay = game.relays[i];
    if (!relay.active) {
      continue;
    }
    relay.group.rotation.y += 0.05;
    relay.group.position.y = Math.sin((performance.now() * 0.002) + i) * 0.3;
  }
}

function updateEnemies(delta) {
  for (const enemy of game.enemies) {
    if (!enemy.hp) continue;
    enemy.group.rotation.y = Math.atan2(player.position.x - enemy.group.position.x, player.position.z - enemy.group.position.z);
    enemy.group.position.x += Math.cos(enemy.drift + game.time * 1.5) * enemy.speed * delta * 0.3;
    enemy.group.position.z += Math.sin(enemy.drift + game.time * 1.5) * enemy.speed * delta * 0.3;
    enemy.group.position.x += (player.position.x - enemy.group.position.x) * delta * 0.28;
    enemy.group.position.z += (player.position.z - enemy.group.position.z) * delta * 0.28;

    const dist = enemy.group.position.distanceTo(player.position);
    if (dist < 10) {
      enemy.shootTimer -= delta;
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = rand(1.5, 3.2);
        const dir = player.position.clone().sub(enemy.group.position).normalize();
        const start = enemy.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        const beam = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([start, start.clone().add(dir.clone().multiplyScalar(1.7))]),
          new THREE.LineBasicMaterial({ color: 0xff7a7a, transparent: true, opacity: 0.7 })
        );
        world.add(beam);
        game.sparkies.push({ mesh: beam, life: 0.12 });
        if (dist < 6.5) {
          damagePlayer(7);
        }
      }
    }
  }
}

function updateParticles(delta) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= delta;
    p.position.addScaledVector(p.velocity, delta);
    p.velocity.multiplyScalar(0.98);
    if (p.life <= 0) {
      game.particles.splice(i, 1);
    }
  }
}

function updateSparkies(delta) {
  for (let i = game.sparkies.length - 1; i >= 0; i--) {
    const s = game.sparkies[i];
    s.life -= delta;
    s.mesh.material.opacity *= 0.85;
    if (s.life <= 0) {
      world.remove(s.mesh);
      game.sparkies.splice(i, 1);
    }
  }
}

function updatePlayer(delta) {
  if (game.victory || game.cutsceneActive) {
    return;
  }

  let moveX = touch.moveX;
  let moveZ = touch.moveY;

  if (keys.forward) moveZ -= 1;
  if (keys.backward) moveZ += 1;
  if (keys.left) moveX -= 1;
  if (keys.right) moveX += 1;

  if (moveX !== 0 || moveZ !== 0) {
    const len = Math.hypot(moveX, moveZ) || 1;
    moveX /= len;
    moveZ /= len;
  }

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const dir = new THREE.Vector3();
  dir.addScaledVector(forward, -moveZ);
  dir.addScaledVector(right, moveX);
  dir.normalize();

  const speed = keys.sprint ? player.speed * 1.45 : player.speed;
  player.velocity.x = dir.x * speed;
  player.velocity.z = dir.z * speed;
  player.position.x += player.velocity.x * delta;
  player.position.z += player.velocity.z * delta;

  const distFromCenter = Math.hypot(player.position.x, player.position.z);
  if (distFromCenter > 24) {
    const norm = Math.hypot(player.position.x, player.position.z) || 1;
    player.position.x *= 23.8 / norm;
    player.position.z *= 23.8 / norm;
  }

  player.position.y = 1.8 + Math.sin(game.time * 6) * 0.08;
  player.invuln = Math.max(0, player.invuln - delta);
  player.fireCooldown = Math.max(0, player.fireCooldown - delta);

  updateCamera();
}

function updateCamera() {
  const yaw = player.yaw;
  const pitch = player.pitch;
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  camera.position.x = player.position.x + Math.sin(yaw) * 0.2;
  camera.position.y = player.position.y + 0.6 + Math.sin(game.time * 10) * 0.03;
  camera.position.z = player.position.z + Math.cos(yaw) * 0.2;
}

function renderScene() {
  renderer.render(scene, camera);
}

function handlePointerMove(event) {
  player.yaw -= event.movementX * 0.0024;
  player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * 0.0017, -1.2, 1.2);
}

function bindInput() {
  window.addEventListener('keydown', (event) => {
    if (game.cutsceneActive) {
      if (event.code === 'Enter' || event.code === 'Space') advanceCutscene();
      return;
    }
    if (event.repeat) return;
    if (event.code === 'KeyR') location.reload();
    if (event.code === 'Space') {
      keys.fire = true;
      sound.init();
      fireWeapon();
    }
    if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.forward = true;
    if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.backward = true;
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.left = true;
    if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.right = true;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') keys.sprint = true;
    if (event.code === 'KeyF' || event.code === 'KeyE') {
      sound.init();
      interact();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') keys.fire = false;
    if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.forward = false;
    if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.backward = false;
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.left = false;
    if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.right = false;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') keys.sprint = false;
  });

  window.addEventListener('mousedown', (event) => {
    if (event.target.closest('#touch-controls')) return;
    sound.init();
    fireWeapon();
  });
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('contextmenu', (event) => event.preventDefault());

  const movePad = document.getElementById('move-pad');
  const moveKnob = document.getElementById('move-knob');
  const lookPad = document.getElementById('look-pad');
  const fireButton = document.getElementById('fire-touch');
  const interactButton = document.getElementById('interact-touch');

  const updateMove = (event) => {
    const rect = movePad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const max = rect.width * 0.34;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, max / length);
    touch.moveX = (dx * scale) / max;
    touch.moveY = (dy * scale) / max;
    moveKnob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  };
  const resetMove = (event) => {
    if (touch.movePointer !== event.pointerId) return;
    touch.movePointer = null;
    touch.moveX = 0;
    touch.moveY = 0;
    moveKnob.style.transform = '';
  };

  movePad.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touch.movePointer = event.pointerId;
    movePad.setPointerCapture(event.pointerId);
    updateMove(event);
  });
  movePad.addEventListener('pointermove', (event) => {
    if (touch.movePointer === event.pointerId) updateMove(event);
  });
  movePad.addEventListener('pointerup', resetMove);
  movePad.addEventListener('pointercancel', resetMove);

  lookPad.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touch.lookPointer = event.pointerId;
    touch.lookX = event.clientX;
    touch.lookY = event.clientY;
    lookPad.setPointerCapture(event.pointerId);
    sound.init();
  });
  lookPad.addEventListener('pointermove', (event) => {
    if (touch.lookPointer !== event.pointerId || game.cutsceneActive) return;
    player.yaw -= (event.clientX - touch.lookX) * 0.006;
    player.pitch = THREE.MathUtils.clamp(player.pitch - (event.clientY - touch.lookY) * 0.0045, -1.2, 1.2);
    touch.lookX = event.clientX;
    touch.lookY = event.clientY;
  });
  const stopLook = (event) => {
    if (touch.lookPointer === event.pointerId) touch.lookPointer = null;
  };
  lookPad.addEventListener('pointerup', stopLook);
  lookPad.addEventListener('pointercancel', stopLook);

  fireButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    fireButton.setPointerCapture(event.pointerId);
    sound.init();
    keys.fire = true;
    fireWeapon();
  });
  const stopFire = (event) => {
    event.preventDefault();
    keys.fire = false;
  };
  fireButton.addEventListener('pointerup', stopFire);
  fireButton.addEventListener('pointercancel', stopFire);
  interactButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    sound.init();
    interact();
  });

  hud.cutsceneContinue.addEventListener('click', () => advanceCutscene());
  hud.cutsceneSkip.addEventListener('click', () => advanceCutscene(true));
  document.body.addEventListener('click', () => sound.init());
}

function handleVictorySequence() {
  if (!game.victory) return;
  const pulse = 0.5 + Math.sin(game.time * 8) * 0.5;
  scene.background.setHSL(0.57, 0.6, 0.15 + pulse * 0.15);
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  game.time += delta;

  if (!game.victory && !game.cutsceneActive && game.health > 0) {
    updatePlayer(delta);
    if (keys.fire) fireWeapon();
    updateEnemies(delta);
    updateRelays();
  }

  updateParticles(delta);
  updateSparkies(delta);
  handleVictorySequence();
  updateHud();
  renderScene();
  requestAnimationFrame(animate);
}

function initialize() {
  setupLevel();
  updateCamera();
  beginMission();
  bindInput();
  updateHud();
  hud.restart.addEventListener('click', () => {
    window.location.reload();
  });
  requestAnimationFrame(animate);
}

initialize();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
