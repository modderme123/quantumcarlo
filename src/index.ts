import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from "dat.gui";

const gui = new dat.GUI();
const params = {
  threshold: 3.5,
  scale: 55,
};
gui.add(params, "threshold", 0.01, 10).onChange(go);
gui.add(params, "scale", 50, 100).onChange(go);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(27, window.innerWidth / window.innerHeight, 5, 3500);
camera.position.z = 250;
const controls = new OrbitControls(camera, renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 2000, 3500);

const particles = 50000;

const geometry = new THREE.BufferGeometry();

function go() {
  const positions = [];
  const colors = [];

  for (let i = 0; i < particles; i++) {
    let x = (Math.random() - 0.5) * params.scale;
    let y = (Math.random() - 0.5) * params.scale;
    let z = (Math.random() - 0.5) * params.scale;

    const r = Math.hypot(x, y, z);
    const p = r / 3;
    const radial = p * p * Math.exp(-p / 2);
    const angular = (3 * z * z - r * r) / (r * r);
    const wave = radial * angular;

    if (wave * wave < params.threshold) {
      // i--;
      continue;
    }
    positions.push(x, y, z);

    if (wave > 0) colors.push(1, 0, 0);
    else colors.push(0, 1, 0);
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
