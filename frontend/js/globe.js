/**
 * globe.js — Three.js 3D Interactive Revenue Globe
 * Visualizes geographic sales volume, live regional pins, and interactive raycasting.
 */
const RetailGlobe = (() => {
  let scene, camera, renderer, globeGroup;
  let animId = null;
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let pins = [];
  let raycaster, mouse;
  let tooltipEl = null;

  // Geographic coordinates for retail regions (Lat, Lon)
  const REGION_COORDS = {
    'SP': { name: 'São Paulo', lat: -23.55, lon: -46.63, weight: 1.0 },
    'RJ': { name: 'Rio de Janeiro', lat: -22.90, lon: -43.17, weight: 0.75 },
    'MG': { name: 'Minas Gerais', lat: -19.92, lon: -43.94, weight: 0.65 },
    'RS': { name: 'Rio Grande do Sul', lat: -30.03, lon: -51.23, weight: 0.50 },
    'PR': { name: 'Paraná', lat: -25.42, lon: -49.27, weight: 0.45 },
    'BA': { name: 'Bahia', lat: -12.97, lon: -38.51, weight: 0.40 },
    'SC': { name: 'Santa Catarina', lat: -27.59, lon: -48.54, weight: 0.35 },
    'PE': { name: 'Pernambuco', lat: -8.05, lon: -34.88, weight: 0.30 },
    'DF': { name: 'Distrito Federal', lat: -15.78, lon: -47.92, weight: 0.35 },
    'GO': { name: 'Goiás', lat: -16.68, lon: -49.26, weight: 0.28 },
    'ES': { name: 'Espírito Santo', lat: -20.31, lon: -40.33, weight: 0.25 },
    'CE': { name: 'Ceará', lat: -3.73, lon: -38.52, weight: 0.22 },
    'PA': { name: 'Pará', lat: -1.45, lon: -48.50, weight: 0.20 }
  };

  function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  function initGlobe(containerId = 'globeContainer', stateData = []) {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === 'undefined') return;

    // Clean any prior canvas
    container.innerHTML = `
      <div class="globe-hud-overlay">
        <div class="globe-hud-title"><i class="bi bi-globe-americas" style="color:var(--accent);"></i> 3D Spatial Revenue Matrix</div>
        <div class="globe-hud-subtitle">Interactive regional hub density & order velocity</div>
      </div>
      <canvas id="globeCanvas"></canvas>
      <div class="globe-tooltip" id="globeTooltip">
        <div class="globe-tooltip-state" id="gttState">State</div>
        <div class="globe-tooltip-val" id="gttVal">$0</div>
        <div class="globe-tooltip-orders" id="gttOrders">0 orders</div>
      </div>
      <div class="globe-controls-hint"><i class="bi bi-arrows-move"></i> Drag to rotate globe</div>
    `;

    const canvas = container.querySelector('#globeCanvas');
    tooltipEl = container.querySelector('#globeTooltip');

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;

    // Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 180;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Base Wireframe & Dot Sphere
    const radius = 60;
    const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x1E293B,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // Inner glowing core
    const innerGeo = new THREE.SphereGeometry(radius * 0.98, 28, 28);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0F172A,
      transparent: true,
      opacity: 0.65
    });
    globeGroup.add(new THREE.Mesh(innerGeo, innerMat));

    // 2. Latitude/Longitude Rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.15 });
    [-30, 0, 30].forEach(lat => {
      const ringGeo = new THREE.BufferGeometry();
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const lon = (i / 64) * 360 - 180;
        points.push(latLonToVector3(lat, lon, radius));
      }
      ringGeo.setFromPoints(points);
      globeGroup.add(new THREE.Line(ringGeo, ringMat));
    });

    // 3. Render 3D Pillars & Pulsing Rings for Retail Hubs
    pins = [];
    const maxRev = stateData.length > 0 ? Math.max(...stateData.map(s => s.revenue || 1)) : 1000000;

    Object.keys(REGION_COORDS).forEach(code => {
      const coord = REGION_COORDS[code];
      const match = stateData.find(s => s.customer_state === code) || {
        customer_state: code,
        revenue: (maxRev * coord.weight * 0.4),
        orders: Math.round(1200 * coord.weight)
      };

      const pos = latLonToVector3(coord.lat, coord.lon, radius);
      const pillarHeight = 6 + (match.revenue / maxRev) * 26;

      // Vertical 3D Cylinder Pillar
      const cylinderGeo = new THREE.CylinderGeometry(0.8, 1.4, pillarHeight, 8);
      cylinderGeo.translate(0, pillarHeight / 2, 0);
      cylinderGeo.rotateX(Math.PI / 2);

      const pillarMat = new THREE.MeshBasicMaterial({
        color: code === 'SP' ? 0xF97316 : (code === 'RJ' ? 0x10B981 : 0xFBBF24),
        transparent: true,
        opacity: 0.9
      });

      const pillar = new THREE.Mesh(cylinderGeo, pillarMat);
      pillar.position.copy(pos);
      pillar.lookAt(new THREE.Vector3(0, 0, 0));
      pillar.userData = { state: coord.name, code, revenue: match.revenue, orders: match.orders };
      globeGroup.add(pillar);
      pins.push(pillar);

      // Glowing Beacon Top Sphere
      const beaconGeo = new THREE.SphereGeometry(2.0, 10, 10);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: code === 'SP' ? 0xFF8A3D : 0x34D399,
        transparent: true,
        opacity: 0.95
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      const topPos = latLonToVector3(coord.lat, coord.lon, radius + pillarHeight);
      beacon.position.copy(topPos);
      beacon.userData = pillar.userData;
      globeGroup.add(beacon);
      pins.push(beacon);
    });

    // Rotate globe naturally toward South America / target region
    globeGroup.rotation.y = 1.6;
    globeGroup.rotation.x = 0.25;

    // Raycaster for Hover
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event Listeners for Interaction
    canvas.addEventListener('mousedown', e => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        globeGroup.rotation.y += deltaX * 0.008;
        globeGroup.rotation.x += deltaY * 0.008;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }

      // Check hover for tooltip
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(pins);

      if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        if (data && data.state) {
          const gttState = tooltipEl.querySelector('#gttState');
          const gttVal = tooltipEl.querySelector('#gttVal');
          const gttOrders = tooltipEl.querySelector('#gttOrders');

          if (gttState) gttState.textContent = `${data.state} (${data.code})`;
          if (gttVal) gttVal.textContent = Utils.formatCurrency(data.revenue);
          if (gttOrders) gttOrders.textContent = `${Utils.formatNumber(data.orders)} orders`;

          tooltipEl.style.left = `${e.clientX - rect.left}px`;
          tooltipEl.style.top = `${e.clientY - rect.top}px`;
          tooltipEl.classList.add('visible');
          canvas.style.cursor = 'pointer';
          return;
        }
      }

      tooltipEl.classList.remove('visible');
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    });

    canvas.addEventListener('mouseleave', () => {
      if (tooltipEl) tooltipEl.classList.remove('visible');
    });

    // Resize Handler
    window.addEventListener('resize', () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth || 480;
      const nh = container.clientHeight || 360;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });

    // Animation Loop
    function animate() {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        globeGroup.rotation.y += 0.0025; // Gentle auto-orbit
      }
      renderer.render(scene, camera);
    }
    if (animId) cancelAnimationFrame(animId);
    animate();
  }

  return { initGlobe };
})();
