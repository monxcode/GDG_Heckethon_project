let scene, camera, renderer, globe, clouds, controls, marker, pulseMarker, sunLight, ambientLight, globeGroup;
let isSolarSync = false;

const weatherMap = {
    0: "Saaf Aasman", 1: "Saaf", 2: "Thode Badal", 3: "Badal",
    45: "Kohar", 48: "Bhaari Kohar", 51: "Boonda-baandi", 61: "Baarish",
    71: "Slight Barf", 80: "Bauchaar", 95: "Toofan"
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

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) { progress = 100; clearInterval(interval); finishLoading(); }
        const bar = document.getElementById('loader-bar');
        const txt = document.getElementById('loader-percent');
        if (bar) bar.style.width = progress + '%';
        if (txt) txt.innerText = Math.floor(progress).toString().padStart(2, '0') + '%';
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
        new THREE.MeshPhongMaterial({ map: loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png'), transparent: true, opacity: 0.4 })
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

// … Rest of the JavaScript code from your original HTML remains unchanged here …