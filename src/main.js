import * as THREE from "three";
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
const camY = -0.8;

// Luces
scene.add(new THREE.HemisphereLight(0xdfffe8, 0x203428, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(3, 5, 7);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8affc0, 0.8);
rim.position.set(-5, 2, -3);
scene.add(rim);

// Materiales y utilidades
const M = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const green = M(0x7dbb8b);
const head_m = M(0x86c796);
const light = M(0xc3e6c4);
const dark = M(0x2b5a3b, 0.8);
const white = M(0xffffff, 0.2);
const black = M(0x050505, 0.1);
const red = M(0xc0392b, 0.5);
const hi = new THREE.MeshBasicMaterial({ color: 0xffffff });

const S = (r) => new THREE.SphereGeometry(r, 40, 24);

function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}

// Cuerpo
const root = new THREE.Group();
scene.add(root);
root.add(mesh(new THREE.CylinderGeometry(0.95, 1.05, 6, 32), green, 0, -3.1, 0));
root.add(mesh(S(1), light, 0, -3, 0.6, 0.78, 3.5, 0.5));

// Moño
const tie = new THREE.Group();
tie.position.set(0.25, -1.05, 0.98);
tie.rotation.z = 0.4;
root.add(tie);
tie.add(mesh(S(0.13), red));
const cone = new THREE.ConeGeometry(0.3, 0.5, 16);
const wl = mesh(cone, red, -0.28, 0, 0, 1, 1, 0.5);
wl.rotation.z = -Math.PI / 2;
const wr = mesh(cone, red, 0.28, 0, 0, 1, 1, 0.5);
wr.rotation.z = Math.PI / 2;
tie.add(wl, wr);

// Brazos
function arm(x, rot, len) {
  const p = new THREE.Group();
  p.position.set(x, -1.15, 0.15);
  p.rotation.z = rot;
  p.add(mesh(new THREE.CylinderGeometry(0.16, 0.14, len, 16), green, 0, len / 2, 0));
  p.add(mesh(S(0.26), green, 0, len, 0, 1, 1.1, 0.6));
  [-1, -0.5, 0, 0.5, 1].forEach((a) => {
    const f = mesh(S(0.085), green, Math.sin(a) * 0.22, len + Math.cos(a) * 0.3, 0, 1, 2.4, 1);
    f.rotation.z = -a + (Math.random() - 0.5) * 0.7;
    p.add(f);
  });
  root.add(p);
  return p;
}
const waveArm = arm(-0.9, 0.9, 1.9);
arm(0.9, Math.PI + 0.2, 0.7);

// Cabeza
const head = new THREE.Group();
head.position.y = 0.1;
root.add(head);
head.add(mesh(S(1), green, 0, 0, 0, 1, 0.85, 1.05));
head.add(mesh(S(1), head_m, 0, -0.25, 0.7, 0.85, 0.5, 0.8));

// z de la superficie del hocico para pegar nariz y sonrisa
const surf = (x, y) => 0.7 + 0.8 * Math.sqrt(Math.max(0, 1 - ((y + 0.25) / 0.5) ** 2 - (x / 0.85) ** 2));

// Fosas nasales (una más grande que la otra)
[-1, 1].forEach((s) =>
  head.add(mesh(S(s < 0 ? 0.08 : 0.035), dark, s * 0.18, 0.05, surf(s * 0.18, 0.05), 1, 1, 0.5))
);

// Sonrisa ladeada
const pts = [];
for (let i = -4; i <= 4; i++) {
  const x = i * 0.12;
  const y = -0.34 - 0.13 * (1 - (x / 0.5) ** 2) + x * 0.18;
  pts.push(new THREE.Vector3(x, y, surf(x, y) + 0.01));
}
head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.035, 8), dark));

// Ojos (desiguales)
const eyes = [];
[-1, 1].forEach((s) => {
  const blink = new THREE.Group();
  blink.position.set(s * 0.68, s < 0 ? 1.02 : 0.8, 0.45);
  const aim = new THREE.Group();
  blink.add(aim);
  aim.add(mesh(S(0.62), white));
  aim.add(mesh(S(s < 0 ? 0.4 : 0.18), black, 0, 0, 0.56, 1, 1, 0.35));
  aim.add(mesh(S(0.06), hi, 0.1, 0.12, 0.65));
  head.add(blink);
  eyes.push({ blink, aim, base: s < 0 ? 1.2 : 0.85 });
});

// Interacción
const clock = new THREE.Clock();
const tgt = new THREE.Vector3(0, camY, 5);
const tgt2 = tgt.clone();
const want = new THREE.Vector3();
let mx = 0, my = 0, last = -9, sur = 0;

addEventListener("pointermove", (e) => {
  mx = (e.clientX / innerWidth) * 2 - 1;
  my = -((e.clientY / innerHeight) * 2 - 1);
  last = clock.elapsedTime;
});
addEventListener("pointerdown", () => { sur = 1; });

function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false);
  camera.aspect = a;
  camera.position.set(0, camY, Math.max(9, 9.5 / a));
  camera.lookAt(0, camY, 0);
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Si el mouse lleva 3 s quieto, los ojos vagan solos
  if (t - last > 3) want.set(Math.sin(t * 0.8) * 5, Math.cos(t * 0.55) * 2.5 + camY, 5);
  else want.set(mx * 9, my * 5 + camY, 5);

  tgt.lerp(want, 1 - Math.exp(-dt * 9));
  tgt2.lerp(want, 1 - Math.exp(-dt * 3.5)); // el segundo ojo sigue con retraso

  sur = Math.max(0, sur - dt * 1.6);
  const g = 1 + 0.3 * sur * sur;

  eyes.forEach((e, i) => {
    e.blink.scale.setScalar(e.base * g);
    e.aim.lookAt(i ? tgt2 : tgt);
  });

  root.rotation.z = Math.sin(t * 1.3) * 0.015 - mx * 0.04 + 0.07;
  head.rotation.set(-my * 0.06, mx * 0.12, -mx * 0.05 + 0.15);
  head.position.y = 0.1 + Math.sin(t * 2) * 0.03;
  waveArm.rotation.z = 0.9 + Math.sin(t * (7 + sur * 10)) * 0.3;

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();