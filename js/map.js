
// Removed jitter function in favor of clustering


// Function to initialize the map
function initMap() {

	// Center the map on Vancouver, Canada
	const map = L.map('map', {
		center: [49.2827, -123.1207], // Coordinates for Vancouver
		zoom: 12 // Adjust zoom level as needed
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
					'liveliness': data.ratings['Liveliness']
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
			return L.divIcon({
				html: `<div style="background-color: ${bgColor}; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.4);"><span>${count}</span></div>`,
				className: `custom-cluster`,
				iconSize: L.point(44, 44)
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
		"Perceived safety": safetyLayer,
		"Density": densityLayer,
		"Liveliness": livelinessLayer
	};

	// Create a layer control and add it to the map
	const layerControl = L.control.layers(baseLayers, overlays).addTo(map);

}


// Call the initMap function to create the map and save into a variable
const map = initMap();

// Call the addData function
addData(map);

