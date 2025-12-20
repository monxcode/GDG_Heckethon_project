let scene, camera, renderer, globe, controls, marker, sunLight, ambientLight, globeGroup;
let isSolarSync = false;

const weatherMap = { 0: "Saaf", 1: "Mainly Saaf", 2: "Badal", 3: "Bhaari Badal", 45: "Fog", 61: "Baarish" };

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 2000);
    camera.position.z = 450;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;

    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const loader = new THREE.TextureLoader();
    globe = new THREE.Mesh(
        new THREE.SphereGeometry(100, 64, 64),
        new THREE.MeshPhongMaterial({
            map: loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
            bumpMap: loader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
            bumpScale: 2
        })
    );
    globeGroup.add(globe);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(500, 300, 400);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    marker = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    globeGroup.add(marker);

    setupEvents();
    animate();
    
    // Initial Load
    setTimeout(() => {
        document.getElementById('loading-overlay').style.display = 'none';
        fetchData("Delhi", "India", 28.6, 77.2);
    }, 2000);
}

async function fetchData(name, country, lat, lon) {
    try {
        const [weatherRes, airRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`)
        ]);

        const wData = await weatherRes.json();
        const aData = await airRes.json();

        // Update UI
        document.getElementById('city-name').innerText = name;
        document.getElementById('aqi-val').innerText = aData.current.us_aqi;
        document.getElementById('temp-val').innerText = Math.round(wData.current.temperature_2m);
        document.getElementById('wind-val').innerText = wData.current.wind_speed_10m;
        document.getElementById('humidity-val').innerText = wData.current.relative_humidity_2m;
        document.getElementById('weather-label').innerText = weatherMap[wData.current.weather_code] || "Variable";

        // Wind Direction Indicator
        document.getElementById('wind-arrow').style.transform = `rotate(${wData.current.wind_direction_10m}deg)`;

        // 7-Day Forecast
        const forecastRow = document.getElementById('forecast-row');
        forecastRow.innerHTML = '';
        wData.daily.time.forEach((date, i) => {
            const dayName = new Date(date).toLocaleDateString('hi-IN', { weekday: 'short' });
            forecastRow.innerHTML += `
                <div class="bg-white/5 p-3 rounded-xl min-w-[80px] text-center border border-white/5">
                    <p class="text-[8px] opacity-50 uppercase font-bold">${dayName}</p>
                    <p class="text-sm font-black my-1">${Math.round(wData.daily.temperature_2m_max[i])}°</p>
                    <p class="text-[7px] text-blue-400 font-bold">${Math.round(wData.daily.temperature_2m_min[i])}°</p>
                </div>
            `;
        });

        moveCamera(lat, lon);
    } catch (err) { console.error("Error fetching data", err); }
}

function moveCamera(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const r = 105;
    const x = -(r * Math.sin(phi) * Math.cos(theta));
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);
    
    marker.position.set(x, y, z);
    gsap.to(camera.position, { x: x*3, y: y*3, z: z*3, duration: 2 });
}

function setupEvents() {
    const sideMenu = document.getElementById('side-menu');
    const backdrop = document.getElementById('menu-backdrop');

    document.getElementById('open-menu').onclick = () => {
        sideMenu.style.transform = 'translateX(0)';
        backdrop.classList.add('open');
    };

    document.getElementById('close-menu').onclick = () => {
        sideMenu.style.transform = 'translateX(100%)';
        backdrop.classList.remove('open');
    };

    document.getElementById('search-go').onclick = async () => {
        const query = document.getElementById('search-input').value;
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1`);
        const data = await res.json();
        if(data.results) {
            const city = data.results[0];
            fetchData(city.name, city.country, city.latitude, city.longitude);
        }
    };
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.onload = init;
