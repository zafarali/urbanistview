
// Removed jitter function in favor of clustering


const CITY_CENTERS = [
	{ name: 'Toronto', lat: 43.6532, lng: -79.3832, zoom: 12 },
	{ name: 'Vancouver', lat: 49.2827, lng: -123.1207, zoom: 12 },
	{ name: 'Montreal', lat: 45.5017, lng: -73.5673, zoom: 12 },
	{ name: 'San Francisco', lat: 37.7749, lng: -122.4194, zoom: 12 }
];

function haversineDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Radius of the earth in km
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c; // Distance in km
}

function findNearestCity(lat, lng) {
	let nearest = CITY_CENTERS[0];
	let minDistance = Infinity;

	CITY_CENTERS.forEach(city => {
		const distance = haversineDistance(lat, lng, city.lat, city.lng);
		if (distance < minDistance) {
			minDistance = distance;
			nearest = city;
		}
	});

	return nearest;
}

function getUserLocation() {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Geolocation is not supported by your browser"));
		} else {
			navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
		}
	});
}

// Function to initialize the map
function initMap(options = {}) {
	const center = options.center || [49.2827, -123.1207];
	const zoom = options.zoom || 12;

	// Center the map
	const map = L.map('map', {
		center: center,
		zoom: zoom
	});

	// Add a tile layer (e.g., OpenStreetMap tiles)
	L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
	}).addTo(map);

	return map; // Return map
}

// Track processed document IDs to avoid duplicates
const processedDocIds = new Set();

// Layer groups mapping
let categoricalLayers = {};

// Function to fetch data for a specific viewport radius
async function fetchGeohashData(center, radiusInM) {
	const geofire = window["geofire-common"];
	const bounds = geofire.geohashQueryBounds(center, radiusInM);
	const promises = bounds.map(b => {
		return db.collection('ratings')
			.orderBy('geohash')
			.startAt(b[0])
			.endAt(b[1])
			.get();
	});

	const snapshots = await Promise.all(promises);
	const newPoints = [];

	snapshots.forEach(snapshot => {
		snapshot.docs.forEach(doc => {
			if (processedDocIds.has(doc.id)) return;
			processedDocIds.add(doc.id);

			const data = doc.data();
			// Ensure we have a location (GeoPoint)
			if (!data.location) return;

			const lat = data.location.latitude;
			const lng = data.location.longitude;

			// Optional: exact distance check if we want a perfect circle, 
			// but for a map viewport, the rectangular geohash bounds are usually fine.

			newPoints.push({
				id: doc.id,
				latitude: lat,
				longitude: lng,
				ratings: data.ratings || {}
			});
		});
	});

	return newPoints;
}

// Function to parse the raw firestore data into our app structure
function transformPoint(point) {
	return {
		latitude: point.latitude,
		longitude: point.longitude,
		'cyclists': point.ratings['Bike infrastructure'],
		'transit': point.ratings['Transit connectivity'],
		'safety': point.ratings['Road Safety Vibes'],
		'density': point.ratings['Density'],
		'liveliness': point.ratings['Liveliness'],
		'transitStopQuality': point.ratings['Transit Stop Quality'],
		'trafficCalming': point.ratings['Traffic Calming'],
		'sidewalkQuality': point.ratings['Sidewalk Quality'],
		'loved': point.ratings['loved'],
		'clean': point.ratings['clean'],
		'activism': point.ratings['activism_and_organizing'],
		'signs': point.ratings['supportive_signs'],
		'greenery': point.ratings['greenery'],
	};
}



async function createEmptyLayerGroup() {
	return L.markerClusterGroup({
		iconCreateFunction: function (cluster) {
			const children = cluster.getAllChildMarkers();
			let scoreSum = 0;
			children.forEach(marker => {
				scoreSum += (marker.urbanistScore || 0);
			});
			const avgScore = scoreSum / children.length;
			const normalizedScore = (avgScore + 1) / 2;
			const hue = normalizedScore * 120;
			const bgColor = `hsla(${hue}, 80%, 45%, 0.9)`;
			const count = cluster.getChildCount();
			const size = Math.min(64, 36 + Math.log10(count) * 12);

			return L.divIcon({
				html: `<div style="background-color: ${bgColor}; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.4);"><span class="cluster-count">${count}</span></div>`,
				className: `custom-cluster`,
				iconSize: L.point(size, size)
			});
		},
		maxClusterRadius: 40,
		spiderfyOnMaxZoom: true,
		showCoverageOnHover: false,
		zoomToBoundsOnClick: true
	});
}

function addPointToLayer(layer, point, columnName, posIcon, negIcon) {
	const val = point[columnName];
	if (val === true) {
		const marker = L.marker([point.latitude, point.longitude], { icon: posIcon });
		marker.urbanistScore = 1;
		layer.addLayer(marker);
	} else if (val === false) {
		const marker = L.marker([point.latitude, point.longitude], { icon: negIcon });
		marker.urbanistScore = -1;
		layer.addLayer(marker);
	}
}


// Function to create a div icon
async function createDivIcon(emoji, color) {
	return L.divIcon({
		// html: `<span style="background-color: ${color}">${emoji}</span>`,
		html: `${emoji}`,
		iconSize: [32, 32],
		iconAnchor: [16, 16],
		className: "leaflet-div-icon emoji-marker",
	});
}


// Function to initialize empty layers and UI controls
async function setupLayers(map) {
	// Icons
	const icons = {
		cyclists: { pos: await createDivIcon('🚲', 'green'), neg: await createDivIcon('🚳', 'red') },
		transit: { pos: await createDivIcon('🚊', 'green'), neg: await createDivIcon('🚗', 'red') },
		safety: { pos: await createDivIcon('😌', 'green'), neg: await createDivIcon('😨', 'red') },
		density: { pos: await createDivIcon('🏙️', 'green'), neg: await createDivIcon('🏡', 'red') },
		liveliness: { pos: await createDivIcon('👯', 'green'), neg: await createDivIcon('😴', 'red') },
		transitStopQuality: { pos: await createDivIcon('🚏', 'green'), neg: await createDivIcon('🚏', 'green') },
		trafficCalming: { pos: await createDivIcon('🍌', 'green'), neg: await createDivIcon('🍌', 'green') },
		sidewalkQuality: { pos: await createDivIcon('🚶', 'green'), neg: await createDivIcon('🚶', 'green') },
		loved: { pos: await createDivIcon('💕', 'green'), neg: await createDivIcon('💕', 'green') },
		clean: { pos: await createDivIcon('🗑️', 'green'), neg: await createDivIcon('🗑️', 'green') },
		activism: { pos: await createDivIcon('📣', 'green'), neg: await createDivIcon('📣', 'green') },
		signs: { pos: await createDivIcon('🪧', 'green'), neg: await createDivIcon('🪧', 'green') },
		greenery: { pos: await createDivIcon('🌱', 'green'), neg: await createDivIcon('🌱', 'green') }
	};

	// Create and store layer groups
	categoricalLayers = {
		cyclists: await createEmptyLayerGroup(),
		transit: await createEmptyLayerGroup(),
		transitStopQuality: await createEmptyLayerGroup(),
		safety: await createEmptyLayerGroup(),
		trafficCalming: await createEmptyLayerGroup(),
		sidewalkQuality: await createEmptyLayerGroup(),
		loved: await createEmptyLayerGroup(),
		clean: await createEmptyLayerGroup(),
		activism: await createEmptyLayerGroup(),
		signs: await createEmptyLayerGroup(),
		greenery: await createEmptyLayerGroup(),
		density: await createEmptyLayerGroup(),
		liveliness: await createEmptyLayerGroup()
	};

	// Add default visible layers
	categoricalLayers.cyclists.addTo(map);
	categoricalLayers.transit.addTo(map);
	categoricalLayers.safety.addTo(map);

	// Setup Layer Control
	const baseLayers = {
		"CyclOSM": L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© CyclOSM' }),
		"OpenStreetMap": L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }),
		"OpenStreetMap HOT": L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap HOT' })
	};

	const overlays = {
		"Bike infra": categoricalLayers.cyclists,
		"Transit connectivity": categoricalLayers.transit,
		"Transit Stop Quality 🚏": categoricalLayers.transitStopQuality,
		"Perceived safety": categoricalLayers.safety,
		"Traffic Calming 🍌": categoricalLayers.trafficCalming,
		"Sidewalk Quality 🚶": categoricalLayers.sidewalkQuality,
		"Neighbourhood — Loved 💕": categoricalLayers.loved,
		"Neighbourhood — Clean 🗑️": categoricalLayers.clean,
		"Neighbourhood — Activism 📣": categoricalLayers.activism,
		"Neighbourhood — Signs 🪧": categoricalLayers.signs,
		"Neighbourhood — Greenery 🌱": categoricalLayers.greenery,
		"Density": categoricalLayers.density,
		"Liveliness": categoricalLayers.liveliness
	};

	L.control.layers(baseLayers, overlays).addTo(map);

	return icons;
}

let iconsCache = null;

// Throttled viewport update
let lastUpdate = 0;
async function updateDataForViewport(map) {
	const now = Date.now();
	if (now - lastUpdate < 1000) return; // 1s debounce
	lastUpdate = now;

	const bounds = map.getBounds();
	const center = [bounds.getCenter().lat, bounds.getCenter().lng];

	// Calculate radius (diagonal distance from center to corner)
	const corner = bounds.getNorthEast();
	const radiusInM = haversineDistance(center[0], center[1], corner.lat, corner.lng) * 1000;

	const points = await fetchGeohashData(center, radiusInM);

	if (points.length === 0) return;

	points.forEach(p => {
		const transformed = transformPoint(p);
		addPointToLayer(categoricalLayers.cyclists, transformed, 'cyclists', iconsCache.cyclists.pos, iconsCache.cyclists.neg);
		addPointToLayer(categoricalLayers.transit, transformed, 'transit', iconsCache.transit.pos, iconsCache.transit.neg);
		addPointToLayer(categoricalLayers.safety, transformed, 'safety', iconsCache.safety.pos, iconsCache.safety.neg);
		addPointToLayer(categoricalLayers.density, transformed, 'density', iconsCache.density.pos, iconsCache.density.neg);
		addPointToLayer(categoricalLayers.liveliness, transformed, 'liveliness', iconsCache.liveliness.pos, iconsCache.liveliness.neg);
		addPointToLayer(categoricalLayers.transitStopQuality, transformed, 'transitStopQuality', iconsCache.transitStopQuality.pos, iconsCache.transitStopQuality.neg);
		addPointToLayer(categoricalLayers.trafficCalming, transformed, 'trafficCalming', iconsCache.trafficCalming.pos, iconsCache.trafficCalming.neg);
		addPointToLayer(categoricalLayers.sidewalkQuality, transformed, 'sidewalkQuality', iconsCache.sidewalkQuality.pos, iconsCache.sidewalkQuality.neg);
		addPointToLayer(categoricalLayers.loved, transformed, 'loved', iconsCache.loved.pos, iconsCache.loved.neg);
		addPointToLayer(categoricalLayers.clean, transformed, 'clean', iconsCache.clean.pos, iconsCache.clean.neg);
		addPointToLayer(categoricalLayers.activism, transformed, 'activism', iconsCache.activism.pos, iconsCache.activism.neg);
		addPointToLayer(categoricalLayers.signs, transformed, 'signs', iconsCache.signs.pos, iconsCache.signs.neg);
		addPointToLayer(categoricalLayers.greenery, transformed, 'greenery', iconsCache.greenery.pos, iconsCache.greenery.neg);
	});
}


// Call the initMap function to create the map and save into a variable
const map = initMap();

async function startup() {
	try {
		const position = await getUserLocation();
		const nearest = findNearestCity(position.coords.latitude, position.coords.longitude);
		map.setView([nearest.lat, nearest.lng], nearest.zoom);
	} catch (error) {
		console.log("Geolocation error or denied. Defaulting to Vancouver.", error);
	}

	// Initialize layers and categorical objects
	iconsCache = await setupLayers(map);

	// Perform initial load
	await updateDataForViewport(map);

	// Listen for map movements to fetch more data
	map.on('moveend', () => updateDataForViewport(map));

	// Handle stats toggle
	const statsToggle = document.getElementById('stats-toggle');
	if (statsToggle) {
		statsToggle.addEventListener('change', (e) => {
			if (e.target.checked) {
				document.body.classList.add('show-stats');
			} else {
				document.body.classList.remove('show-stats');
			}
		});
	}
}

startup();

