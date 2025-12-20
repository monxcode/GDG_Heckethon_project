let scene, camera, renderer, globe, clouds, controls, marker, pulseMarker, sunLight, ambientLight, globeGroup;
let isSolarSync = false;

const weatherMap = {
    0: "Saaf Aasman", 1: "Saaf", 2: "Thode Badal", 3: "Badal", 45: "Kohar",
    48: "Bhaari Kohar", 51: "Boonda-baandi", 61: "Baarish", 71: "Slight Barf",
    80: "Bauchaar", 95: "Toofan"
};

const pollutedCities = [
    { name: "Lahore", lat: 31.52, lon: 74.35, country: "Pakistan", level: "Hazardous" },
    { name: "Delhi", lat: 28.61, lon: 77.20, country: "India", level: "Severe" },
    { name: "Dhaka", lat: 23.81, lon: 90.41, country: "Bangladesh", level: "Very High" },
    { name: "Karachi", lat: 24.86, lon: 67.00, country: "Pakistan", level: "High" },
    { name: "Beijing", lat: 39.90, lon: 116.40, country: "China", level: "High" },
    { name: "Mumbai", lat: 19.07, lon: 72.87, country: "India", level: "Moderate" },
    { name: "Baghdad", lat: 33.31, lon: 44.36, country: "Iraq", level: "High" },
    { name: "Cairo", lat: 30.04, lon: 31.23, country: "Egypt", level: "High" },
    { name: "Kolkata", lat: 22.57, lon: 88.36, country: "India", level: "High" },
    { name: "Shenyang", lat: 41.80, lon: 123.43, country: "China", level: "High" }
];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = window.innerWidth < 768 ? 550 : 450;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const loader = new THREE.TextureLoader();

    // Progress bar logic
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            finishLoading();
        }
        document.getElementById('loader-bar').style.width = progress + '%';
        document.getElementById('loader-percent').innerText = Math.floor(progress).toString().padStart(2, '0') + '%';
    }, 150);

    globe = new THREE.Mesh(
        new THREE.SphereGeometry(100, 64, 64),
        new THREE.MeshPhongMaterial({
            map: loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
            bumpMap: loader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
            bumpScale: 1.5,
            specular: new THREE.Color(0x333333),
            shininess: 5
        })
    );
    globeGroup.add(globe);

    clouds = new THREE.Mesh(
        new THREE.SphereGeometry(101.5, 64, 64),
        new THREE.MeshPhongMaterial({
            map: loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png'),
            transparent: true,
            opacity: 0.4
        })
    );
    globeGroup.add(clouds);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(500, 300, 400);
    scene.add(sunLight);

    marker = new THREE.Mesh(new THREE.CircleGeometry(2, 32), new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide }));
    marker.visible = false;
    globeGroup.add(marker);

    pulseMarker = new THREE.Mesh(new THREE.RingGeometry(2.5, 5, 32), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    pulseMarker.visible = false;
    globeGroup.add(pulseMarker);

    setupUI();
    animate();
    fetchData("Delhi", "India", 28.61, 77.20);
}

function finishLoading() {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 800);
    }
}

function setupUI() {
    const sideMenu = document.getElementById('side-menu');
    const menuBackdrop = document.getElementById('menu-backdrop');
    
    document.getElementById('open-menu').onclick = (e) => {
        e.stopPropagation();
        sideMenu.classList.add('open');
        menuBackdrop.classList.add('open');
    };

    document.getElementById('close-menu').onclick = () => {
        sideMenu.classList.remove('open');
        menuBackdrop.classList.remove('open');
    };

    menuBackdrop.onclick = () => {
        sideMenu.classList.remove('open');
        menuBackdrop.classList.remove('open');
    };

    // Search
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('results-dropdown');
    
    const triggerSearch = async () => {
        const val = input.value.trim();
        if (val.length < 2) return;
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${val}&count=1`);
        const data = await res.json();
        if (data.results && data.results[0]) {
            const i = data.results[0];
            fetchData(i.name, i.country, i.latitude, i.longitude);
            dropdown.classList.add('hidden');
        }
    };

    input.onkeydown = (e) => { if (e.key === "Enter") triggerSearch(); };
    document.getElementById('search-go').onclick = triggerSearch;

    // Polluted cities
    const pollutedList = document.getElementById('polluted-city-list');
    pollutedCities.forEach(c => {
        const div = document.createElement('div');
        div.className = "interactive polluted-city-card p-4 rounded-xl cursor-pointer border border-white/5";
        div.innerHTML = `<div class="flex justify-between items-center"><div><p class="text-[9px] font-black uppercase tracking-widest">${c.name}</p><p class="text-[7px] opacity-40 uppercase font-bold">${c.country}</p></div><span class="text-[7px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase tracking-tighter">${c.level}</span></div>`;
        div.onclick = () => fetchData(c.name, c.country, c.lat, c.lon);
        pollutedList.appendChild(div);
    });

    document.getElementById('toggle-city-list').onclick = () => {
        const container = document.getElementById('city-list-container');
        container.classList.toggle('show');
        document.getElementById('chevron-icon').style.transform = container.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
    };

    document.getElementById('solar-toggle').onchange = (e) => {
        isSolarSync = e.target.checked;
        document.getElementById('solar-desc').innerText = isSolarSync ? "Synced! Ab real-time lighting hogi." : "Static light ka upyog ho raha hai.";
        updateSolarPosition();
    };
}

async function fetchData(name, country, lat, lon) {
    document.getElementById('results-dropdown').classList.add('hidden');
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-backdrop').classList.remove('open');
    try {
        const [wRes, aRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`)
        ]);
        const w = await wRes.json();
        const a = await aRes.json();
        updateDisplay(name, country, a.current.us_aqi, w.current);
        moveCamera(lat, lon);
    } catch(e) { console.error(e); }
}

function updateDisplay(name, country, aqi, weather) {
    document.getElementById('city-name').innerText = name;
    document.getElementById('country-name').innerText = country;
    document.getElementById('aqi-val').innerText = aqi;
    document.getElementById('temp-val').innerText = Math.round(weather.temperature_2m);
    document.getElementById('humidity-val').innerText = weather.relative_humidity_2m;
    document.getElementById('wind-val').innerText = Math.round(weather.wind_speed_10m);
    document.getElementById('weather-label').innerText = weatherMap[weather.weather_code] || "Variable";
    processSafety(aqi);
}

function processSafety(aqi) {
    const status = document.getElementById('aqi-status');
    const box = document.getElementById('advisory-box');
    const card = document.getElementById('data-card');
    let color, label, msg;

    if(aqi <= 50) { color = "#10b981"; label = "Saaf / Good"; msg = "Hawa saaf hai!"; }
    else if(aqi <= 100) { color = "#fbbf24"; label = "Moderate"; msg = "Sensitive log dhyan dein."; }
    else if(aqi <= 200) { color = "#f87171"; label = "Unhealthy"; msg = "Mask pehen kar niklein."; }
    else { color = "#a855f7"; label = "Hazardous"; msg = "Bahar jane se bachein!"; }

    status.innerText = label;
    status.style.color = color;
    document.getElementById('aqi-val').style.color = color;
    box.innerText = msg;
    card.style.borderBottomColor = color;
    marker.material.color.set(color);
    pulseMarker.material.color.set(color);
}

function moveCamera(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const r = 101.5;
    const x = -(r * Math.sin(phi) * Math.cos(theta));
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);

    marker.position.set(x, y, z);
    marker.lookAt(0, 0, 0);
    marker.visible = true;
    pulseMarker.position.set(x, y, z);
    pulseMarker.lookAt(0, 0, 0);
    pulseMarker.visible = true;

    controls.autoRotate = false;
    gsap.to(camera.position, { x: x * 3.5, y: y * 3.5, z: z * 3.5, duration: 2, onComplete: () => controls.autoRotate = true });
}

function resetCamera() {
    controls.autoRotate = true;
    marker.visible = false;
    pulseMarker.visible = false;
    gsap.to(camera.position, { x: 0, y: 0, z: window.innerWidth < 768 ? 550 : 450, duration: 2 });
}

function updateSolarPosition() {
    if (!isSolarSync) {
        sunLight.position.set(500, 300, 400);
        ambientLight.intensity = 0.5;
        return;
    }
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const sunLon = -((utcHours / 24) * 360 - 180);
    const sunLat = 23.5 * Math.sin((2 * Math.PI * 172) / 365);
    const phi = (90 - sunLat) * (Math.PI / 180);
    const theta = (sunLon + 180) * (Math.PI / 180);
    sunLight.position.set(-(500 * Math.sin(phi) * Math.cos(theta)), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
    ambientLight.intensity = 0.2;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if(clouds) clouds.rotation.y += 0.0001;
    if(pulseMarker.visible) {
        const s = 1 + (Math.sin(Date.now() * 0.005) + 1) * 0.5;
        pulseMarker.scale.set(s, s, s);
        pulseMarker.material.opacity = 0.8 - (s-1);
    }
    renderer.render(scene, camera);
}

setInterval(() => {
    const d = new Date();
    document.getElementById('digital-clock').innerText = d.toLocaleTimeString('en-GB');
    document.getElementById('utc-label').innerText = "UTC Engine Sync: " + d.toISOString().split('T')[1].split('.')[0];
}, 1000);

window.onload = init;
window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
