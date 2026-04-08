// Main logic for the rating page (index.html)

// Expect firebase, firebaseui, and firebase-config.js to be loaded first.

var user_info = {};

function getUiConfig() {
  // FirebaseUI config.
  return {
    callbacks: {
      signInSuccessWithAuthResult: function (authResult, redirectUrl) {
        var user = authResult.user;
        if (authResult.user) {
          handleSignedInUser(authResult.user);
        }
        showToast('Signed in successfully', 'success');
        return false;
      },
      signInFailure: function (error) {
        // Some unrecoverable error occurred during sign-in.
        // Return a promise when error handling is completed and FirebaseUI
        // will reset, clearing any UI.
        showToast('Failed to sign in: ' + error.toString(), 'error');
        return false;
      },
      uiShown: function () {
        // The widget is rendered.
        // Hide the loader.
        document.getElementById('loader').style.display = 'none';
      }
    },
    signInSuccessUrl: '/index.html',
    // Leave the lines as is for the providers you want to offer your users.
    signInOptions: [
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
    ],
  };
}

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());

firebase.auth().onAuthStateChanged(function (user) {
  user ? handleSignedInUser(user) : handleSignedOutUser();
});

var handleSignedOutUser = function () {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('sign-out').style.display = 'none';
  document.getElementById('main-wrapper').style.display = 'none';
  document.getElementById('submit-button').style.display = 'none';
  document.getElementById('firebaseui-auth-container').style.display = 'block';
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function () {
    ui.start('#firebaseui-auth-container', getUiConfig());
  });
};

var handleSignedInUser = function (username) {
  document.getElementById('loader').style.display = 'block';
  document.getElementById('sign-out').style.display = 'block';
  document.getElementById('main-wrapper').style.display = 'block';
  document.getElementById('submit-button').style.display = 'block';
  document.getElementById('firebaseui-auth-container').style.display = 'none';
  document.getElementById('loader').textContent = 'Welcome, ' + username.email;
  document.getElementById('sign-out').onclick = function () {
    firebase.auth().signOut();
  };
  user_info['user'] = username.email;
};

// Get references to the rating rows and submit button
const ratingRows = document.querySelectorAll('#rating-rows .rating-row');
const submitButton = document.getElementById('submit-button');

// Object to store ratings, using categories as keys
const ratings = {};

let toastTimeoutId = null;

function showToast(message, variant) {
  const toast = document.getElementById('toast');
  if (!toast) {
    alert(message);
    return;
  }
  toast.textContent = message;
  toast.classList.remove('toast--error', 'toast--success');
  if (variant === 'error') {
    toast.classList.add('toast--error');
  } else if (variant === 'success') {
    toast.classList.add('toast--success');
  }
  toast.classList.add('toast--visible');
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 3000);
}

// Function to handle thumbs-up or thumbs-down clicks
function handleRatingClick(event) {
  // Identify the rating category
  const ratingCategory = event.target.closest('.rating-row').querySelector('h3').textContent;

  // Clear previous selection for the category
  delete ratings[ratingCategory];

  // Check if clicked button is thumbs-up/thumbs-down
  if (event.target.classList.contains('thumbs-up')) {
    ratings[ratingCategory] = true; // Store selection as "positive"
  } else if (event.target.classList.contains('thumbs-down')) {
    ratings[ratingCategory] = false; // Store selection as "negative"
  }

  // Remove "selected" class from all buttons in the row
  const allButtons = event.target.closest('.rating-row').querySelectorAll('.thumbs-up, .thumbs-down');
  for (const button of allButtons) {
    button.classList.remove('selected');
  }

  // Add "selected" class to the clicked button
  event.target.classList.add('selected');
}

function handleToggle(event) {
  const key = event.target.dataset.key;
  if (event.target.classList.contains('selected')) {
    event.target.classList.remove('selected');
    delete ratings[key];
  } else {
    ratings[key] = true;
    event.target.classList.add('selected');
  }
}

// Use event delegation for all rating and toggle clicks
const ratingRowsContainer = document.getElementById('rating-rows');
if (ratingRowsContainer) {
  ratingRowsContainer.addEventListener('click', (event) => {
    const target = event.target;

    // Check for thumbs-up/down
    if (target.classList.contains('thumbs-up') || target.classList.contains('thumbs-down')) {
      handleRatingClick(event);
    }

    // Check for toggles
    if (target.classList.contains('toggle')) {
      handleToggle(event);
    }
  });
} else {
  console.error('Urbanist: #rating-rows container not found');
}

// Handle submit button click
submitButton.addEventListener('click', () => {
  getLocation();
});

// Function to get the user's location and combine with ratings
function getLocation() {
  if (navigator.geolocation) {
    submitButton.disabled = true;
    const originalLabel = submitButton.textContent;
    submitButton.textContent = 'Saving...';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const geofire = window["geofire-common"];
        const hash = geofire.geohashForLocation([latitude, longitude]);
        const location = new firebase.firestore.GeoPoint(latitude, longitude);

        // Combine ratings and coordinates into a single object
        const allData = {
          ratings,
          freeformText: document.getElementById("freeform-input").value,
        };

        db.collection('ratings')
          .add({
            user_info: user_info,
            ratings: allData.ratings,
            geohash: hash,
            location: location,
            extra: allData.freeformText,
            timestamp: new Date().toISOString()
          })
          .then(() => {
            showToast('Thanks! Your rating has been recorded.', 'success');
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
            resetForm();
          })
          .catch((error) => {
            console.error('Error saving data:', error);
            showToast('Error saving data. Please try again.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
          });

      },
      (error) => {
        showToast('Error: Could not get your location.', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit this place';
      }
    );
  } else {
    showToast('Geolocation is not supported by your browser.', 'error');
  }
}

// Emoji legend overlay
const legendBtn = document.getElementById('legend-btn');
const legendOverlay = document.getElementById('legend-overlay');
const legendClose = document.getElementById('legend-close');

function openLegend() {
  legendOverlay.classList.add('open');
  legendOverlay.setAttribute('aria-hidden', 'false');
}

function closeLegend() {
  legendOverlay.classList.remove('open');
  legendOverlay.setAttribute('aria-hidden', 'true');
}

legendBtn.addEventListener('click', openLegend);
legendClose.addEventListener('click', closeLegend);
legendOverlay.addEventListener('click', (e) => {
  if (e.target === legendOverlay) closeLegend();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLegend();
});

function resetForm() {
  // Clear the ratings state object
  Object.keys(ratings).forEach(key => delete ratings[key]);

  // Remove selected class from all rating buttons
  document.querySelectorAll('.thumbs-up.selected, .thumbs-down.selected, .toggle.selected')
    .forEach(el => el.classList.remove('selected'));

  // Clear freeform text input
  document.getElementById('freeform-input').value = '';
}

