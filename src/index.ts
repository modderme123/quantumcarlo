import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from "dat.gui";

const gui = new dat.GUI();
const params = {
  n: 3,
  l: 1,
  m: 1,
  scale: 30,
  threshold: 0.0001,
  guesses: 500000,
};
gui.add(params, "n", 1).onChange(go).step(1).name("n (n>0)");
gui.add(params, "l").onChange(go).step(1).name("l (0≤l&lt;n)");
gui.add(params, "m").onChange(go).step(1).name("m (abs(m)≤l)");
gui.add(params, "scale").onChange(go);
gui.add(params, "threshold").onChange(go);
gui.add(params, "guesses", 1).onChange(go).step(1);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(27, window.innerWidth / window.innerHeight, 5, 3500);
camera.position.z = 150;
const controls = new OrbitControls(camera, renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6f0ef);
scene.fog = new THREE.Fog(0x050505, 150, 170);

const geometry = new THREE.BufferGeometry();

const a0 = 1; //5.29177210903e-11;

function factorial(num: number) {
  if (num <= 1) return 1;
  for (let i = num - 1; i >= 1; i--) {
    num *= i;
  }
  return num;
}

function choosei(n: number, k: number) {
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n + 1 - i) / i;
  }
  return result;
}

function legendre(l: number, m: number) {
  let prefix = (-1) ** m * 2 ** l;
  let coeffs = [];
  for (let k = m; k <= l; k++) {
    coeffs.push((factorial(k) / factorial(k - m)) * choosei(l, k) * choosei((l + k - 1) / 2, l));
  }
  return (x: number) => {
    let sum = 0;
    for (let k = 0; k <= l - m; k++) {
      sum += coeffs[k] * x ** k;
    }
    return prefix * (1 - x ** 2) ** (m / 2) * sum;
  };
}

function sphericalHarmonics(l: number, m: number) {
  const absM = Math.abs(m);
  const legendreOpt = legendre(l, absM);
  const prefix =
    (1 - (m & 1) * 2) *
    (m == 0 ? 1 : Math.SQRT2) *
    Math.sqrt(((2 * l + 1) * factorial(l - absM)) / (4 * Math.PI * factorial(l + absM)));

  return (theta: number, phi: number) => {
    return prefix * legendreOpt(Math.cos(theta)) * (m >= 0 ? Math.cos(m * phi) : Math.sin(absM * phi));
  };
}

function laguerre(n: number, alpha: number) {
  let coeffs = [];
  for (let i = 0; i <= n; i++) {
    coeffs.push(choosei(n + alpha, n - i) / factorial(i));
  }
  return (x: number) => {
    let sum = 0;
    for (let i = 0; i <= n; i++) {
      sum += coeffs[i] * Math.pow(-x, i);
    }
    return sum;
  };
}

function waveFn(n: number, l: number, m: number) {
  const sqrtThing = Math.sqrt(((2 / (n * a0)) ** 3 * factorial(n - l - 1)) / (2 * n * factorial(l + n)));
  const laguerreOpt = laguerre(n - l - 1, 2 * l + 1);
  const sphericalOpt = sphericalHarmonics(l, m);
  return (r: number, theta: number, phi: number) => {
    let p = (2 * r) / (n * a0); //rho

    return sqrtThing * Math.exp(-p / 2) * p ** l * laguerreOpt(p) * sphericalOpt(theta, phi);
  };
}

function tests() {
  console.log(legendre(2, 1)(-0.8), 1.44);
  console.log(laguerre(3, 1)(6), 4);
  console.log(sphericalHarmonics(0, 0)(0, 0), 1 / (2 * Math.sqrt(Math.PI)));

  let x = (Math.random() - 0.5) * params.scale;
  let y = (Math.random() - 0.5) * params.scale;
  let z = (Math.random() - 0.5) * params.scale;

  const r = Math.hypot(x, y, z);
  const phi = Math.atan2(y, x);
  const theta = Math.acos(z / r);

  console.log(
    sphericalHarmonics(3, -3)(theta, phi),
    ((1 / 4) * Math.sqrt(35 / (2 * Math.PI)) * (3 * x ** 2 - y ** 2) * y) / r ** 3
  );

  console.log(
    waveFn(3, 1, 0)(r, theta, phi),
    (2 * Math.sqrt(2) * r * Math.exp(-r / 3) * (2 - r / 3) * Math.cos(theta) * Math.sqrt(3 / (4 * Math.PI))) /
      (27 * Math.sqrt(3))
  );
}
// tests();

function go() {
  params.l = Math.min(Math.max(params.l, 0), params.n - 1);
  params.m = Math.min(Math.max(params.m, -params.l), params.l);
  const positions = [];
  const colors = [];

  let wave = waveFn(params.n, params.l, params.m);
  for (let i = 0; i < params.guesses; i++) {
    let x = (Math.random() - 0.5) * params.scale;
    let y = (Math.random() - 0.5) * params.scale;
    let z = (Math.random() - 0.5) * params.scale;

    const r = Math.hypot(x, y, z);
    const phi = Math.atan2(y, x);
    const theta = Math.acos(z / r);

    const waveOut = wave(r, theta, phi);

    if (waveOut * waveOut < params.threshold) continue;

    positions.push((x / params.scale) * 50, (y / params.scale) * 50, (z / params.scale) * 50);

    if (waveOut > 0) colors.push(0xd4 / 0xff, 0x94 / 0xff, 0x21 / 0xff);
    else colors.push(0x88 / 0xff, 0xaf / 0xff, 0xa6 / 0xff);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  geometry.computeBoundingSphere();
}
go();

const material = new THREE.PointsMaterial({ size: 1, vertexColors: true });
const points = new THREE.Points(geometry, material);
scene.add(points);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
});
