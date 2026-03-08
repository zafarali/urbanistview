
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


// Function to fetch and parse CSV data
async function fetchAndParseData() {

	var parsed_data = [];
	await db.collection("ratings").get().then((querySnapshot) => {
		querySnapshot.forEach((doc) => {
			// doc.data() is never undefined for query doc snapshots
			// console.log(doc.id, " => ", doc.data());
			const data = doc.data();
			parsed_data.push(
				{
					latitude: data.coordinates.latitude,
					longitude: data.coordinates.longitude,
					'cyclists': data.ratings['Bike infrastructure'],
					'transit': data.ratings['Transit connectivity'],
					'safety': data.ratings['Road Safety Vibes'],
					'density': data.ratings['Density'],
					'liveliness': data.ratings['Liveliness'],
					'transitStopQuality': data.ratings['Transit Stop Quality'],
					'trafficCalming': data.ratings['Traffic Calming'],
					'sidewalkQuality': data.ratings['Sidewalk Quality'],
					'loved': data.ratings['loved'],
					'clean': data.ratings['clean'],
					'activismAndOrganizing': data.ratings['activism_and_organizing'],
					'supportiveSigns': data.ratings['supportive_signs'],
					'greenery': data.ratings['greenery'],
				}
			)
		});
	});
	return parsed_data;
}



async function createLayerGroupForColumn(map, data, columnName, posIcon, negIcon) {
	const markers = L.markerClusterGroup({
		iconCreateFunction: function (cluster) {
			const children = cluster.getAllChildMarkers();
			let scoreSum = 0;
			children.forEach(marker => {
				scoreSum += (marker.urbanistScore || 0);
			});
			// Average score maps between -1 to 1
			const avgScore = scoreSum / children.length;

			// Normalize to 0 to 1
			const normalizedScore = (avgScore + 1) / 2;

			// Calculate Hue: 0 is Red, 120 is Green
			const hue = normalizedScore * 120;
			// Vibrant high-opacity background
			const bgColor = `hsla(${hue}, 80%, 45%, 0.9)`;

			const count = cluster.getChildCount();

			// Dynamic size based on count: log scale for better distribution
			// Base size 36px for small clusters, up to 64px for very large ones
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
	const posPoints = data.filter(point => point[columnName] === true);
	posPoints.forEach(point => {
		const marker = L.marker([point.latitude, point.longitude], { icon: posIcon });
		marker.urbanistScore = 1;
		markers.addLayer(marker);
	});
	const negPoints = data.filter(point => point[columnName] === false);
	negPoints.forEach(point => {
		const marker = L.marker([point.latitude, point.longitude], { icon: negIcon });
		marker.urbanistScore = -1;
		markers.addLayer(marker);
	});

	return markers;
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


// Function to add data to the map
async function addData(map) {
	const data = await fetchAndParseData();
	// Add bike layer ----------------------------------------------------------
	const posBikeIcon = await createDivIcon('🚲', 'green');
	const negBikeIcon = await createDivIcon('🚳', 'red');
	const cyclistLayer = await createLayerGroupForColumn(map, data, 'cyclists', posBikeIcon, negBikeIcon);
	cyclistLayer.addTo(map);

	// Add transit layer ---------------------------------------------------------
	const posTransitIcon = await createDivIcon(`🚊`, 'green');
	const negTransitIcon = await createDivIcon(`🚗`, 'red');
	const transitLayer = await createLayerGroupForColumn(map, data, 'transit', posTransitIcon, negTransitIcon);
	transitLayer.addTo(map);

	// Add safety layer ---------------------------------------------------------
	const posSafetyIcon = await createDivIcon(`😌`, 'green');
	const negSafetyIcon = await createDivIcon(`😨`, 'red');
	const safetyLayer = await createLayerGroupForColumn(map, data, 'safety', posSafetyIcon, negSafetyIcon);
	safetyLayer.addTo(map);

	// Add density layer ---------------------------------------------------------
	const posDensityIcon = await createDivIcon(`🏙️`, 'green');
	const negDensityIcon = await createDivIcon(`🏡`, 'red');
	const densityLayer = await createLayerGroupForColumn(map, data, 'density', posDensityIcon, negDensityIcon);

	// Add liveliness layer ---------------------------------------------------------
	const posLivelinessIcon = await createDivIcon(`👯`, 'green');
	const negLivelinessIcon = await createDivIcon(`😴`, 'red');
	const livelinessLayer = await createLayerGroupForColumn(map, data, 'liveliness', posLivelinessIcon, negLivelinessIcon);

	// Transit Stop Quality
	const transitStopLayer = await createLayerGroupForColumn(map, data, 'transitStopQuality',
		await createDivIcon('🚏', 'green'), await createDivIcon('🚏', 'green'));

	// Traffic Calming
	const trafficLayer = await createLayerGroupForColumn(map, data, 'trafficCalming',
		await createDivIcon('🍌', 'green'), await createDivIcon('🍌', 'green'));

	// Sidewalk Quality
	const sidewalkLayer = await createLayerGroupForColumn(map, data, 'sidewalkQuality',
		await createDivIcon('🚶', 'green'), await createDivIcon('🚶', 'green'));

	// Neighbourhood Care sub-layers
	const lovedLayer = await createLayerGroupForColumn(map, data, 'loved', await createDivIcon('💕', 'green'), await createDivIcon('💕', 'green'));
	const cleanLayer = await createLayerGroupForColumn(map, data, 'clean', await createDivIcon('🗑️', 'green'), await createDivIcon('🗑️', 'green'));
	const activismLayer = await createLayerGroupForColumn(map, data, 'activismAndOrganizing', await createDivIcon('📣', 'green'), await createDivIcon('📣', 'green'));
	const signsLayer = await createLayerGroupForColumn(map, data, 'supportiveSigns', await createDivIcon('🪧', 'green'), await createDivIcon('🪧', 'green'));
	const greeneryLayer = await createLayerGroupForColumn(map, data, 'greenery', await createDivIcon('🌱', 'green'), await createDivIcon('🌱', 'green'));

	// Create our base layer and overlays --------------------------------------
	// Following: https://leafletjs.com/examples/layers-control/
	const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '© OpenStreetMap'
	});

	const osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
	});

	// https://www.cyclosm.org/#map=12/49.2576/-123.1241/cyclosm
	const cyclosm = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '© CyclOSM is based on OpenStreetMap. Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
	});

	const cyclosmlite = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '© CyclOSM is based on OpenStreetMap. Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
	});

	const baseLayers = {
		"CyclOSM": cyclosm,
		"OpenStreetMap": osm,
		"OpenStreetMap HOT": osmHOT
	};

	const overlays = {
		"CyclOSM lite": cyclosmlite,
		"Bike infra": cyclistLayer,
		"Transit connectivity": transitLayer,
		"Transit Stop Quality 🚏": transitStopLayer,
		"Perceived safety": safetyLayer,
		"Traffic Calming 🍌": trafficLayer,
		"Sidewalk Quality 🚶": sidewalkLayer,
		"Neighbourhood — Loved 💕": lovedLayer,
		"Neighbourhood — Clean 🗑️": cleanLayer,
		"Neighbourhood — Activism 📣": activismLayer,
		"Neighbourhood — Signs 🪧": signsLayer,
		"Neighbourhood — Greenery 🌱": greeneryLayer,
		"Density": densityLayer,
		"Liveliness": livelinessLayer
	};

	// Create a layer control and add it to the map
	const layerControl = L.control.layers(baseLayers, overlays).addTo(map);

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
	// Call the addData function regardless of geolocation result
	addData(map);

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

