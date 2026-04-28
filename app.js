/**
 * App.js - 3D Geometry E-Book Interactive Logic
 */

// Basic State
const state = {
  currentTopic: 'lines',
  misconceptionHidden: true,
  realLifeHidden: true,
  animationCache: {}
};

// Data Model for the content
const contentData = {
  'lines': {
    title: '空間中的直線關係',
    desc: '探討兩條直線在三維空間中可能的交集狀態：相交、垂直、平行與歪斜(Skew)。',
    misconception: '「如果在空間中兩條直線不相交，那麼它們一定平行。」—— 這是錯誤的！在三維空間中，不相交且不平行的兩條線稱為<strong style="color:var(--primary)">歪斜線</strong>。',
    realLife: '<strong>飛機的航線</strong>：在不同高度飛行的兩架飛機，它們的航線不會相交，也不一定平行。<strong>天橋與底下的馬路</strong>也是經典的歪斜線例子。',
    controls: [
      { id: 'btn-intersect', text: '相交於一點' },
      { id: 'btn-perp', text: '互相垂直' },
      { id: 'btn-parallel', text: '互相平行' },
      { id: 'btn-skew', text: '歪斜關係 (Skew)', default: true }
    ]
  },
  'line-plane': {
    title: '空間中的線與面',
    desc: '一條直線與一個平面的關係：相交於一點、平行、包含於平面。',
    misconception: '「一條直線如果垂直於平面上的一條線，那就與該平面垂直。」—— 錯誤！必須垂直於平面上<strong>兩條相交</strong>的直線，才能確定線與面垂直。',
    realLife: '<strong>旗桿與地面</strong>：筆直插在廣場上的旗桿，與地面垂直。<strong>桌腳與地板</strong>：良好的桌腳會垂直於地板面。',
    controls: [
      { id: 'btn-lp-intersect', text: '相交 (斜交)' },
      { id: 'btn-lp-parallel', text: '互相平行', default: true },
      { id: 'btn-lp-perp', text: '垂直於平面' }
    ]
  },
  'planes': {
    title: '空間中的面與面',
    desc: '兩個平面在空間中的關係：平行或交於一條直線。',
    misconception: '「兩個平面可以只交於一個點。」—— 錯誤！由於平面是無限延伸的，如果兩個平面相交，它們的交集必定是<strong>一條直線</strong>。',
    realLife: '<strong>書本的兩頁</strong>：打開的書本，兩頁相交於中間的書脊（一條線）。<strong>天花板與地板</strong>則是平行的例子。',
    controls: [
      { id: 'btn-pp-parallel', text: '互相平行' },
      { id: 'btn-pp-intersect', text: '交於一線', default: true }
    ]
  },
  'polyhedra': {
    title: '正多面體探索 (Platonic Solids)',
    desc: '由全等的正多邊形組成，且每個頂點相接的面的數量相同的立體圖形。空間中只存在5種正多面體。',
    misconception: '「任何正多邊形都可以組成正多面體。」—— 錯誤！要形成立體角，同一個頂點旁所有多邊形的內角和必須<strong>小於 360 度</strong>。例如3個正六邊形內角和已達360度，無法形成立體。',
    realLife: '<strong>RPG骰子</strong>：常見的 D4, D6, D8, D12, D20 骰子就是這五種正多面體。某些<strong>病毒的蛋白質外殼</strong>（如腺病毒）呈現正二十面體。',
    controls: [
      { id: 'btn-tet', text: '四面體' },
      { id: 'btn-hex', text: '六面體', default: true },
      { id: 'btn-oct', text: '八面體' },
      { id: 'btn-dod', text: '十二面體' },
      { id: 'btn-ico', text: '二十面體' }
    ]
  }
};

// -- Three.js Global Setup --
const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f18);

const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
camera.position.set(20, 15, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasContainer.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 50;
controls.minDistance = 5;

// Global Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x00f2fe, 1, 50);
pointLight.position.set(-10, 10, -10);
scene.add(pointLight);

// Current scene objects group
let currentObjectsGroup = new THREE.Group();
scene.add(currentObjectsGroup);

// Utility to clear current scene
function clearScene() {
  while (currentObjectsGroup.children.length > 0) {
    const obj = currentObjectsGroup.children[0];
    currentObjectsGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  }
}

// Global visual styles
const lineMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 3 });
const lineMat2 = new THREE.LineBasicMaterial({ color: 0xff0844, linewidth: 3 });
const planeMatSolid = new THREE.MeshLambertMaterial({
  color: 0x1e293b,
  transparent: true,
  opacity: 0.8,
  side: THREE.DoubleSide
});
const planeMatWire = new THREE.LineBasicMaterial({ color: 0x4facfe, transparent: true, opacity: 0.3 });

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// --- Window Resize ---
window.addEventListener('resize', () => {
  if (canvasContainer) {
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  }
});

// --- UI Interaction ---
const topicTitle = document.getElementById('topic-title');
const topicDesc = document.getElementById('topic-desc');
const misCard = document.getElementById('misconception-card');
const misText = document.getElementById('misconception-text');
const rlCard = document.getElementById('real-life-card');
const rlText = document.getElementById('real-life-text');
const sceneControls = document.getElementById('scene-controls');

function updateUIForTopic(topicId) {
  const data = contentData[topicId];
  topicTitle.textContent = data.title;
  topicDesc.textContent = data.desc;
  misText.innerHTML = data.misconception;
  rlText.innerHTML = data.realLife;

  const unfoldBtn = document.getElementById('toggle-unfold');
  if (unfoldBtn) unfoldBtn.style.display = (topicId === 'polyhedra') ? 'flex' : 'none';

  // Rebuild controls
  sceneControls.innerHTML = '';
  data.controls.forEach(ctrl => {
    const btn = document.createElement('button');
    btn.id = ctrl.id;
    btn.textContent = ctrl.text;
    if (ctrl.default) btn.classList.add('active');
    btn.addEventListener('click', (e) => {
      // Toggle active class visually
      document.querySelectorAll('#scene-controls button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      handleControlClick(topicId, ctrl.id);
    });
    sceneControls.appendChild(btn);
  });
}

function setActiveNav(target) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.target === target) item.classList.add('active');
  });
}

// Tool Buttons
const netModal = document.getElementById('net-modal');
if (document.getElementById('toggle-unfold')) {
  document.getElementById('toggle-unfold').addEventListener('click', () => {
    netModal.classList.remove('hidden');
    const activeBtn = document.querySelector('#scene-controls button.active');
    drawNetCanvas(activeBtn ? activeBtn.id : 'btn-hex');
  });
}
if (document.getElementById('close-net-modal')) {
  document.getElementById('close-net-modal').addEventListener('click', () => netModal.classList.add('hidden'));
}

document.getElementById('toggle-misconception').addEventListener('click', () => {
  state.misconceptionHidden = !state.misconceptionHidden;
  if (state.misconceptionHidden) misCard.classList.add('hidden');
  else misCard.classList.remove('hidden');
});
document.getElementById('toggle-real-life').addEventListener('click', () => {
  state.realLifeHidden = !state.realLifeHidden;
  if (state.realLifeHidden) rlCard.classList.add('hidden');
  else rlCard.classList.remove('hidden');
});
document.getElementById('reset-view').addEventListener('click', () => {
  gsap.to(camera.position, {
    x: 20, y: 15, z: 20,
    duration: 1,
    ease: "power2.inOut"
  });
  controls.target.set(0, 0, 0);
});

document.querySelectorAll('.close-card').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.target.closest('.info-card').classList.add('hidden');
    // update state
    if (e.target.closest('#misconception-card')) state.misconceptionHidden = true;
    if (e.target.closest('#real-life-card')) state.realLifeHidden = true;
  });
});

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget.dataset.target;
    if (state.currentTopic === target) return;
    state.currentTopic = target;
    setActiveNav(target);
    updateUIForTopic(target);
    loadSceneForTopic(target);
  });
});

// --- Scene Generators ---
let dynObjs = {};

function createTubeLine(points, colorHex) {
  const path = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(path, 20, 0.15, 8, false);
  const material = new THREE.MeshLambertMaterial({ color: colorHex });
  return new THREE.Mesh(geometry, material);
}

function loadSceneForTopic(topicId) {
  clearScene();
  dynObjs = {};

  // Base Grid helper for space representation
  const gridHelper = new THREE.GridHelper(40, 40, 0x1e293b, 0x1e293b);
  gridHelper.position.y = -10;
  currentObjectsGroup.add(gridHelper);

  if (topicId === 'lines') {
    // Two lines, we animate their end points
    // Line A: Red
    const L1_points = [new THREE.Vector3(-10, 0, 0), new THREE.Vector3(10, 0, 0)];
    dynObjs.line1 = createTubeLine(L1_points, 0xff0844);
    currentObjectsGroup.add(dynObjs.line1);

    // Line B: Blue (Aligned with X-axis initially so rotations are relative)
    const L2_points = [new THREE.Vector3(-10, 0, 0), new THREE.Vector3(10, 0, 0)];
    dynObjs.line2 = createTubeLine(L2_points, 0x00f2fe);
    // Default is Skew
    dynObjs.line2.position.set(0, 5, 0);
    dynObjs.line2.rotation.y = Math.PI / 6;
    currentObjectsGroup.add(dynObjs.line2);

    // Default is Skew, animates when clicking buttons
  }
  else if (topicId === 'line-plane') {
    // Plane
    const planeGeom = new THREE.PlaneGeometry(20, 20);
    const planeMesh = new THREE.Mesh(planeGeom, planeMatSolid);
    planeMesh.rotation.x = -Math.PI / 2;
    currentObjectsGroup.add(planeMesh);

    // Grid on plane
    const planeGrid = new THREE.GridHelper(20, 10, 0x4facfe, 0x4facfe);
    currentObjectsGroup.add(planeGrid);

    // Line
    dynObjs.planeLine = createTubeLine([new THREE.Vector3(-15, 5, 0), new THREE.Vector3(15, 5, 0)], 0xff0844);
    currentObjectsGroup.add(dynObjs.planeLine);

    // Proof lines for perpendicularity
    dynObjs.proofLine1 = createTubeLine([new THREE.Vector3(-10, 0, 0), new THREE.Vector3(10, 0, 0)], 0x10b981); // Emerald
    dynObjs.proofLine2 = createTubeLine([new THREE.Vector3(0, 0, -10), new THREE.Vector3(0, 0, 10)], 0xf59e0b); // Amber
    dynObjs.proofLine1.material.transparent = true;
    dynObjs.proofLine1.material.opacity = 0;
    dynObjs.proofLine2.material.transparent = true;
    dynObjs.proofLine2.material.opacity = 0;
    currentObjectsGroup.add(dynObjs.proofLine1, dynObjs.proofLine2);
    // Default is parallel
  }
  else if (topicId === 'planes') {
    // Two planes
    dynObjs.plane1Group = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), planeMatSolid);
    const g1 = new THREE.GridHelper(20, 10, 0xff0844, 0xff0844);
    g1.rotation.x = Math.PI / 2;
    dynObjs.plane1Group.add(p1, g1);
    dynObjs.plane1Group.rotation.x = -Math.PI / 2;

    dynObjs.plane2Group = new THREE.Group();
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), planeMatSolid);
    const g2 = new THREE.GridHelper(20, 10, 0x00f2fe, 0x00f2fe);
    g2.rotation.x = Math.PI / 2;
    dynObjs.plane2Group.add(p2, g2);
    dynObjs.plane2Group.rotation.x = -Math.PI / 2;

    // Initial intersect (angled)
    dynObjs.plane2Group.rotation.x = -Math.PI / 4;

    currentObjectsGroup.add(dynObjs.plane1Group, dynObjs.plane2Group);
  }
  else if (topicId === 'polyhedra') {
    dynObjs.polyGroup = new THREE.Group();
    currentObjectsGroup.add(dynObjs.polyGroup);

    renderPolyhedron('btn-hex'); // default is Hexahedron

    // Add rotating animation
    gsap.to(dynObjs.polyGroup.rotation, {
      y: Math.PI * 2,
      duration: 20,
      repeat: -1,
      ease: "none"
    });
  }
}

// Handle dynamic 3D interactions
function handleControlClick(topicId, ctrlId) {
  if (topicId === 'lines') {
    if (ctrlId === 'btn-intersect') {
      gsap.to(dynObjs.line2.position, { x: 0, y: 0, z: 0, duration: 1.5 });
      gsap.to(dynObjs.line2.rotation, { x: 0, y: Math.PI / 4, z: 0, duration: 1.5 });
    } else if (ctrlId === 'btn-perp') {
      gsap.to(dynObjs.line2.position, { x: 0, y: 0, z: 0, duration: 1.5 });
      gsap.to(dynObjs.line2.rotation, { x: 0, y: Math.PI / 2, z: 0, duration: 1.5 });
    } else if (ctrlId === 'btn-parallel') {
      gsap.to(dynObjs.line2.position, { x: 0, y: 5, z: 0, duration: 1.5 });
      gsap.to(dynObjs.line2.rotation, { x: 0, y: 0, z: 0, duration: 1.5 });
    } else if (ctrlId === 'btn-skew') {
      gsap.to(dynObjs.line2.position, { x: 0, y: 5, z: 0, duration: 1.5 });
      gsap.to(dynObjs.line2.rotation, { x: 0, y: Math.PI / 6, z: 0, duration: 1.5 });
    }
  }
  else if (topicId === 'line-plane') {
    // Hide proof lines by default
    gsap.to([dynObjs.proofLine1.material, dynObjs.proofLine2.material], { opacity: 0, duration: 0.5 });

    if (ctrlId === 'btn-lp-intersect') {
      gsap.to(dynObjs.planeLine.position, { x: 0, y: 0, z: 0, duration: 1.5 });
      gsap.to(dynObjs.planeLine.rotation, { z: Math.PI / 6, x: Math.PI / 12, duration: 1.5 });
    } else if (ctrlId === 'btn-lp-parallel') {
      gsap.to(dynObjs.planeLine.position, { x: 0, y: 5, z: 0, duration: 1.5 });
      gsap.to(dynObjs.planeLine.rotation, { z: 0, x: 0, duration: 1.5 });
    } else if (ctrlId === 'btn-lp-perp') {
      gsap.to(dynObjs.planeLine.position, { x: 0, y: 0, z: 0, duration: 1.5 });
      gsap.to(dynObjs.planeLine.rotation, { z: Math.PI / 2, x: 0, duration: 1.5 });
      // Reveal proof lines
      gsap.to([dynObjs.proofLine1.material, dynObjs.proofLine2.material], { opacity: 1, duration: 1.5, delay: 0.5 });
    }
  }
  else if (topicId === 'planes') {
    if (ctrlId === 'btn-pp-parallel') {
      gsap.to(dynObjs.plane2Group.position, { y: 5, duration: 1.5 });
      gsap.to(dynObjs.plane2Group.rotation, { x: -Math.PI / 2, duration: 1.5 });
    } else if (ctrlId === 'btn-pp-intersect') {
      gsap.to(dynObjs.plane2Group.position, { y: 0, duration: 1.5 });
      gsap.to(dynObjs.plane2Group.rotation, { x: -Math.PI / 4, duration: 1.5 });
    }
  }
  else if (topicId === 'polyhedra') {
    renderPolyhedron(ctrlId);
    if (netModal && !netModal.classList.contains('hidden')) {
      drawNetCanvas(ctrlId);
    }
  }
}

function buildUnfoldablePolyhedron(geometry, commonMaterial, edgesMaterial, parentGroup) {
  let nonIndexed = geometry.getIndex() ? geometry.toNonIndexed() : geometry.clone();
  nonIndexed.computeVertexNormals();
  const pos = nonIndexed.getAttribute('position');
  const faceGroups = [];

  for (let i = 0; i < pos.count; i += 3) {
    const v1 = new THREE.Vector3().fromBufferAttribute(pos, i);
    const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const v3 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const cb = new THREE.Vector3().subVectors(v3, v2);
    const ab = new THREE.Vector3().subVectors(v1, v2);
    const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();
    let found = null;
    for (let g of faceGroups) {
      if (g.normal.dot(normal) > 0.99) { found = g; break; }
    }
    if (found) found.triangles.push([v1, v2, v3]);
    else faceGroups.push({ normal: normal, triangles: [[v1, v2, v3]] });
  }

  const areEdgesEqual = (e1, e2) => {
    return (e1[0].distanceTo(e2[0]) < 0.01 && e1[1].distanceTo(e2[1]) < 0.01) ||
      (e1[0].distanceTo(e2[1]) < 0.01 && e1[1].distanceTo(e2[0]) < 0.01);
  };

  const faces = [];
  for (let g of faceGroups) {
    const faceGeom = new THREE.BufferGeometry();
    const vertices = [];
    for (let tri of g.triangles) vertices.push(...tri[0].toArray(), ...tri[1].toArray(), ...tri[2].toArray());
    faceGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    faceGeom.computeVertexNormals();

    const mesh = new THREE.Mesh(faceGeom, commonMaterial.clone());
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(faceGeom), edgesMaterial));

    const edgeMap = [];
    for (let tri of g.triangles) {
      for (let i = 0; i < 3; i++) {
        const e = [tri[i], tri[(i + 1) % 3]];
        let idx = edgeMap.findIndex(ec => areEdgesEqual(ec.v, e));
        if (idx !== -1) edgeMap[idx].count++; else edgeMap.push({ v: e, count: 1 });
      }
    }
    const outerEdges = edgeMap.filter(ec => ec.count === 1).map(ec => ec.v);
    faces.push({ mesh: mesh, normal: g.normal.clone(), edges: outerEdges });
  }

  if (faces.length === 0) return;

  const visited = new Set([0]);
  const queue = [0];

  const shapeGroup = new THREE.Group();
  shapeGroup.add(faces[0].mesh);
  faces[0].mesh.userData.isRoot = true;

  while (queue.length > 0) {
    const curr = queue.shift();
    for (let n = 0; n < faces.length; n++) {
      if (visited.has(n)) continue;
      let sharedEdge = null;
      for (let e1 of faces[curr].edges) {
        for (let e2 of faces[n].edges) {
          if (areEdgesEqual(e1, e2)) { sharedEdge = e1; break; }
        }
        if (sharedEdge) break;
      }
      if (sharedEdge) {
        visited.add(n); queue.push(n);
        const f = faces[n];

        const M = new THREE.Vector3().addVectors(sharedEdge[0], sharedEdge[1]).multiplyScalar(0.5);
        f.mesh.geometry.translate(-M.x, -M.y, -M.z);
        f.mesh.position.copy(M);

        faces[curr].mesh.attach(f.mesh);

        const dirWorld = new THREE.Vector3().subVectors(sharedEdge[1], sharedEdge[0]).normalize();
        const invQ = f.mesh.getWorldQuaternion(new THREE.Quaternion()).invert();
        const localAxis = dirWorld.applyQuaternion(invQ).normalize();

        const dot = Math.max(-1, Math.min(1, f.normal.dot(faces[curr].normal)));
        const theta = Math.acos(dot);

        const origQ = f.mesh.quaternion.clone();
        f.mesh.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(localAxis, theta));
        f.mesh.updateMatrixWorld(true);
        const testN = f.normal.clone().transformDirection(f.mesh.matrixWorld).normalize();
        const pN = faces[curr].normal.clone().transformDirection(faces[curr].mesh.matrixWorld).normalize();

        let finalTheta = testN.dot(pN) < 0.9 ? -theta : theta;

        f.mesh.quaternion.copy(origQ);

        f.mesh.userData.origQuat = origQ.clone();
        f.mesh.userData.foldAxis = localAxis;
        f.mesh.userData.foldAngle = finalTheta;
        f.mesh.userData.isUnfolded = false;
      }
    }
  }

  // Align shapeGroup so faces[0] is flat on the floor (pointing UP)
  const targetNormal = new THREE.Vector3(0, 1, 0);
  const alignQ = new THREE.Quaternion().setFromUnitVectors(faces[0].normal, targetNormal);
  shapeGroup.quaternion.copy(alignQ);
  parentGroup.add(shapeGroup);
}

function renderPolyhedron(type) {
  // clear existing mesh
  while (dynObjs.polyGroup.children.length > 0) {
    const obj = dynObjs.polyGroup.children[0];
    dynObjs.polyGroup.remove(obj);
    obj.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  let geom;
  let stats = { v: 0, e: 0, f: 0 };
  const radius = 6;

  switch (type) {
    case 'btn-tet': geom = new THREE.TetrahedronGeometry(radius); stats = { v: 4, e: 6, f: 4 }; break;
    case 'btn-hex': geom = new THREE.BoxGeometry(radius * 1.2, radius * 1.2, radius * 1.2); stats = { v: 8, e: 12, f: 6 }; break;
    case 'btn-oct': geom = new THREE.OctahedronGeometry(radius); stats = { v: 6, e: 12, f: 8 }; break;
    case 'btn-dod': geom = new THREE.DodecahedronGeometry(radius); stats = { v: 20, e: 30, f: 12 }; break;
    case 'btn-ico': geom = new THREE.IcosahedronGeometry(radius); stats = { v: 12, e: 30, f: 20 }; break;
  }

  const baseMat = new THREE.MeshLambertMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

  buildUnfoldablePolyhedron(geom, baseMat, edgeMat, dynObjs.polyGroup);
  geom.dispose();

  // Inject Stats into card if not exist
  misText.innerHTML = contentData['polyhedra'].misconception +
    `<div class="poly-stats">
        <div class="stat-item"><span class="stat-val">${stats.v}</span><span class="stat-lbl">頂點 (V)</span></div>
        <div class="stat-item"><span class="stat-val">-</span><span class="stat-lbl"></span></div>
        <div class="stat-item"><span class="stat-val">${stats.e}</span><span class="stat-lbl">邊 (E)</span></div>
        <div class="stat-item"><span class="stat-val">+</span><span class="stat-lbl"></span></div>
        <div class="stat-item"><span class="stat-val">${stats.f}</span><span class="stat-lbl">面 (F)</span></div>
        <div class="stat-item"><span class="stat-val">=</span><span class="stat-lbl"></span></div>
        <div class="stat-item"><span class="stat-val">2</span><span class="stat-lbl">尤拉公式</span></div>
    </div>`;
}

// -- 2D Net Canvas Drawing --
function drawNetCanvas(type) {
  const canvas = document.getElementById('net-canvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = 460;
  const cssHeight = 400;

  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';

  const cx = cssWidth / 2;
  const cy = cssHeight / 2;

  function poly(x, y, sides, radius, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const ang = rot + (i * 2 * Math.PI / sides);
      const px = x + radius * Math.cos(ang);
      const py = y + radius * Math.sin(ang);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  if (type === 'btn-tet') {
    const R = 150;
    const p1 = [cx, cy - R], p2 = [cx + R * Math.cos(Math.PI / 6), cy + R * Math.sin(Math.PI / 6)], p3 = [cx - R * Math.cos(Math.PI / 6), cy + R * Math.sin(Math.PI / 6)];
    ctx.beginPath();
    ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.closePath();
    const m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], m2 = [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2], m3 = [(p3[0] + p1[0]) / 2, (p3[1] + p1[1]) / 2];
    ctx.moveTo(...m1); ctx.lineTo(...m2); ctx.lineTo(...m3); ctx.lineTo(...m1);
    ctx.fill(); ctx.stroke();
  }
  else if (type === 'btn-hex') {
    const s = 60;
    ctx.beginPath();
    ctx.rect(cx - s / 2, cy - s * 1.5, s, s * 4);
    ctx.rect(cx - s * 1.5, cy - s / 2, s * 3, s);
    ctx.fill(); ctx.stroke();
    // Inner lines
    ctx.beginPath();
    ctx.moveTo(cx - s / 2, cy - s / 2); ctx.lineTo(cx + s / 2, cy - s / 2);
    ctx.moveTo(cx - s / 2, cy + s / 2); ctx.lineTo(cx + s / 2, cy + s / 2);
    ctx.moveTo(cx - s / 2, cy + s * 1.5); ctx.lineTo(cx + s / 2, cy + s * 1.5);
    ctx.moveTo(cx - s / 2, cy - s / 2); ctx.lineTo(cx - s / 2, cy + s / 2);
    ctx.moveTo(cx + s / 2, cy - s / 2); ctx.lineTo(cx + s / 2, cy + s / 2);
    ctx.stroke();
  }
  else if (type === 'btn-oct') {
    const s = 80, h = s * Math.sqrt(3) / 2;
    const startX = cx - s * 2, startY = cy - h / 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const upX = startX + i * s;
      ctx.moveTo(upX, startY + h); ctx.lineTo(upX + s, startY + h); ctx.lineTo(upX + s / 2, startY); ctx.lineTo(upX, startY + h);
      ctx.moveTo(upX + s / 2, startY); ctx.lineTo(upX + s * 1.5, startY); ctx.lineTo(upX + s, startY + h); ctx.lineTo(upX + s / 2, startY);
    }
    ctx.fill(); ctx.stroke();
  }
  else if (type === 'btn-dod') {
    const R = 40;
    const h = R * Math.cos(Math.PI / 5);
    const drawGroup = (gx, gy, gRot) => {
      poly(gx, gy, 5, R, gRot);
      for (let i = 0; i < 5; i++) {
        const ang = gRot + (i + 0.5) * 2 * Math.PI / 5;
        poly(gx + 2 * h * Math.cos(ang), gy + 2 * h * Math.sin(ang), 5, R, gRot + Math.PI);
      }
    };
    drawGroup(cx, cy - 2.6 * h, -Math.PI / 2);
    drawGroup(cx, cy + 2.6 * h, Math.PI / 2);
  }
  else if (type === 'btn-ico') {
    const s = 45, h = s * Math.sqrt(3) / 2;
    const startX = cx - s * 2.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const bx = startX + i * s;
      ctx.moveTo(bx, cy + h / 2); ctx.lineTo(bx + s, cy + h / 2); ctx.lineTo(bx + s / 2, cy - h / 2);
      ctx.moveTo(bx + s / 2, cy - h / 2); ctx.lineTo(bx + s * 1.5, cy - h / 2); ctx.lineTo(bx + s, cy + h / 2);
      ctx.moveTo(bx + s / 2, cy - h / 2); ctx.lineTo(bx + s, cy - h * 1.5); ctx.lineTo(bx + s * 1.5, cy - h / 2);
      ctx.moveTo(bx, cy + h / 2); ctx.lineTo(bx + s / 2, cy + h * 1.5); ctx.lineTo(bx + s, cy + h / 2);
    }
    ctx.fill(); ctx.stroke();
  }
}

// Initial Boot
updateUIForTopic(state.currentTopic);
loadSceneForTopic(state.currentTopic);

// --- Raycasting for 3D rotative unfolding ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (e) => {
  if (state.currentTopic !== 'polyhedra' || !dynObjs.polyGroup) return;
  const rect = canvasContainer.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(dynObjs.polyGroup.children, true);

  dynObjs.polyGroup.traverse(c => {
    if (c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(0x000000);
  });

  if (intersects.length > 0) {
    let faceMesh = intersects[0].object;
    if (faceMesh.type !== 'Mesh') faceMesh = faceMesh.parent;
    if (faceMesh && faceMesh.isMesh && faceMesh.material) {
      faceMesh.material.emissive.setHex(0x114455);
      document.body.style.cursor = 'pointer';
      return;
    }
  }
  document.body.style.cursor = 'default';
});

window.addEventListener('click', (e) => {
  if (state.currentTopic !== 'polyhedra' || !dynObjs.polyGroup) return;
  if (!e.target.closest('#canvas-container')) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(dynObjs.polyGroup.children, true);

  if (intersects.length > 0) {
    let faceMesh = intersects[0].object;
    if (faceMesh.type !== 'Mesh') faceMesh = faceMesh.parent;

    if (faceMesh && faceMesh.isMesh) {
      if (faceMesh.userData.isRoot) {
        const foldAll = !faceMesh.userData.allUnfolded;
        faceMesh.userData.allUnfolded = foldAll;
        dynObjs.polyGroup.traverse(child => {
          if (child.userData.foldAxis && child.userData.isUnfolded !== foldAll) {
            child.userData.isUnfolded = foldAll;
            const origQ = child.userData.origQuat;
            const tQ = origQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(child.userData.foldAxis, child.userData.foldAngle));
            const toQ = foldAll ? tQ : origQ;
            const fromQ = child.quaternion.clone();
            const st = { p: 0 };
            gsap.to(st, { p: 1, duration: 1.2, ease: "power2.out", onUpdate: () => child.quaternion.slerpQuaternions(fromQ, toQ, st.p) });
          }
        });
      } else if (faceMesh.userData.foldAxis) {
        faceMesh.userData.isUnfolded = !faceMesh.userData.isUnfolded;
        const origQ = faceMesh.userData.origQuat;
        const tQ = origQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(faceMesh.userData.foldAxis, faceMesh.userData.foldAngle));
        const toQ = faceMesh.userData.isUnfolded ? tQ : origQ;
        const fromQ = faceMesh.quaternion.clone();
        const st = { p: 0 };
        gsap.to(st, { p: 1, duration: 0.8, ease: "power2.out", onUpdate: () => faceMesh.quaternion.slerpQuaternions(fromQ, toQ, st.p) });
      }
    }
  }
});
