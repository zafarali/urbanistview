
// Function to initialize the map
function initMap() {

	// Center the map on Vancouver, Canada
	const map = L.map('map', {
	  center: [49.2827, -123.1207], // Coordinates for Vancouver
	  zoom: 12 // Adjust zoom level as needed
	});
  
	// Add a tile layer (e.g., OpenStreetMap tiles)
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);

	return map; // Return map
  }



// Function to fetch and parse CSV data
async function fetchAndParseData() {
	const response = await fetch('data.csv');
	const csvText = await response.text();
	const data = Papa.parse(csvText, {
	  header: true,
	  transformHeader: header => header.toLowerCase() // Convert headers to lowercase
	}).data;
	return data;
  }



// Function to create a layer group for a given column
async function createLayerGroupForColumn(map, data, columnName, divIcon) {
	
	const filteredPoints = data.filter(point => point[columnName] === "true");
  
	const layerGroup = L.layerGroup();
  
	filteredPoints.forEach(point => {
	  const marker = L.marker([point.latitude, point.longitude], { icon: divIcon }).addTo(layerGroup);
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
	const bikeIcon = await createDivIcon('🚲');
	const cyclistLayer = await createLayerGroupForColumn(map, data, 'cyclists', bikeIcon);
	cyclistLayer.addTo(map);

	// Add truck layer ---------------------------------------------------------
	const truckIcon = await createDivIcon(`🛻`);
	const truckLayer = await createLayerGroupForColumn(map, data, 'trucks', truckIcon);
	truckLayer.addTo(map);

	// Create our base layer and overlays --------------------------------------
	// Following: https://leafletjs.com/examples/layers-control/
	const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    	maxZoom: 19,
    	attribution: '© OpenStreetMap'
	});

	const osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'});

	const baseLayers = {
		"OpenStreetMap": osm,
		"OpenStreetMap HOT": osmHOT
	};
	const overlays = {
  		"Cyclists": cyclistLayer,
		"Trucks": truckLayer
	};

	// Create a layer control and add it to the map
	const layerControl = L.control.layers(baseLayers, overlays).addTo(map);

  }
  

// Call the initMap function to create the map and save into a variable
const map = initMap();

// Call the addData function
addData(map);

