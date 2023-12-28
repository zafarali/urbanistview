
// Function to initialize the map
function initMap() {

	// Center the map on Vancouver, Canada
	const map = L.map('map', {
	  center: [49.2827, -123.1207], // Coordinates for Vancouver
	  zoom: 12 // Adjust zoom level as needed
	});
  
	// Add a tile layer (e.g., OpenStreetMap tiles)
	L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
	  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);

	return map; // Return map
  }



// Function to fetch and parse CSV data
async function fetchAndParseData() {
	const response = await fetch('data.csv');
	const csvText = await response.text();
	const parsedData = Papa.parse(csvText, {
	  header: true
	});
	
	console.log(parsedData.data);
	return parsedData.data;
  }


// Function to create a layer group for a given column
async function createLayerGroupForColumn(map, data, columnName, posIcon, negIcon) {
	
	const layerGroup = L.layerGroup();
  
	const posPoints = data.filter(point => point[columnName] === "true");
	posPoints.forEach(point => {
	  const marker = L.marker([point.latitude, point.longitude], { icon: posIcon }).addTo(layerGroup);
	});
	const negPoints = data.filter(point => point[columnName] === "false");
	negPoints.forEach(point => {
	  const marker = L.marker([point.latitude, point.longitude], { icon: negIcon }).addTo(layerGroup);
	});
  
	return layerGroup;
  }


// Function to create a div icon
async function createDivIcon(emoji) {
	return L.divIcon({
	  className: 'emoji', // Class for styling
	  html: `${emoji}`,
	  iconSize: [50, 50] // Optional size for consistency
	});
  }
  
  
// Function to add data to the map
async function addData(map) {
	const data = await fetchAndParseData();
  
	// Add bike layer ----------------------------------------------------------
	const posBikeIcon = await createDivIcon('🚲');
	const negBikeIcon = await createDivIcon('🚳');
	const cyclistLayer = await createLayerGroupForColumn(map, data, 'cyclists', posBikeIcon, negBikeIcon);
	cyclistLayer.addTo(map);

	// Add transit layer ---------------------------------------------------------
	const posTransitIcon = await createDivIcon(`🚊`);
	const negTransitIcon = await createDivIcon(`🚗`);
	const transitLayer = await createLayerGroupForColumn(map, data, 'transit', posTransitIcon, negTransitIcon);
	transitLayer.addTo(map);

	// Add safety layer ---------------------------------------------------------
	const posSafetyIcon = await createDivIcon(`😌`);
	const negSafetyIcon = await createDivIcon(`😨`);
	const safetyLayer = await createLayerGroupForColumn(map, data, 'safety', posSafetyIcon, negSafetyIcon);
	safetyLayer.addTo(map);

	// Add density layer ---------------------------------------------------------
	const posDensityIcon = await createDivIcon(`🏙️`);
	const negDensityIcon = await createDivIcon(`🏡`);
	const densityLayer = await createLayerGroupForColumn(map, data, 'density', posDensityIcon, negDensityIcon);

	// Add liveliness layer ---------------------------------------------------------
	const posLivelinessIcon = await createDivIcon(`👯`);
	const negLivelinessIcon = await createDivIcon(`😴`);
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

