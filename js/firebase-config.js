// Shared Firebase initialization for the Urbanist web app
// Uses the compat SDK already loaded on the page.

const firebaseConfig = {
  apiKey: "AIzaSyDUsq12dvJHfWugismw78QpXT86CbTt-ks",
  authDomain: "urbanistviewfromtheground.firebaseapp.com",
  projectId: "urbanistviewfromtheground",
  storageBucket: "urbanistviewfromtheground.appspot.com",
  messagingSenderId: "447455183888",
  appId: "1:447455183888:web:3257e5ff3435492ac8f695"
};

if (!firebase.apps || firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

// Expose shared instances for pages that include this script.
const db = firebase.firestore();
const auth = firebase.auth();

