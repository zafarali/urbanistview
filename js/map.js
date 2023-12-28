
// Function to add jitter to a coordinate
function jitter(coordinate) {
	const jitterAmount = 0.0001
  const randomOffset = Math.random() * jitterAmount * 2 - jitterAmount; // Random offset within the jitter range
  return coordinate + randomOffset;
}


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


  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDUsq12dvJHfWugismw78QpXT86CbTt-ks",
    authDomain: "urbanistviewfromtheground.firebaseapp.com",
    projectId: "urbanistviewfromtheground",
    storageBucket: "urbanistviewfromtheground.appspot.com",
    messagingSenderId: "447455183888",
    appId: "1:447455183888:web:3257e5ff3435492ac8f695"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();


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
    			'liveliness': data.ratings['Liveliness']}
    		)
    	});
	});
	return parsed_data;
  }



async function createLayerGroupForColumn(map, data, columnName, posIcon, negIcon) {
	const layerGroup = L.layerGroup();  
	const posPoints = data.filter(point => point[columnName] === true);
	posPoints.forEach(point => {
	  const marker = L.marker([jitter(point.latitude), jitter(point.longitude)], { icon: posIcon }).addTo(layerGroup);
	});
	const negPoints = data.filter(point => point[columnName] === false);
	negPoints.forEach(point => {
	  const marker = L.marker([jitter(point.latitude), jitter(point.longitude)], { icon: negIcon }).addTo(layerGroup);
	});
  
	return layerGroup;
  }


// Function to create a div icon
async function createDivIcon(emoji, color) {
	return L.divIcon({
	  // html: `<span style="background-color: ${color}">${emoji}</span>`,
	  html: `${emoji}`,
	  iconSize: [50, 50], // Optional size for consistency
	  className: "emoji",
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

