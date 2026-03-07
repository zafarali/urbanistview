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
  ui.start('#firebaseui-auth-container', getUiConfig());
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

function toggleKidFriendly(event) {
  const ratingCategory = 'kid_friendly' + event.target.closest('.rating-row').querySelector('h3').textContent;
  if (event.target.classList.contains('selected')) {
    event.target.classList.remove('selected');
    delete ratings[ratingCategory];
  } else {
    ratings[ratingCategory] = true;
    event.target.classList.add('selected');
  }
}

// Add event listeners to all thumbs-up and thumbs-down buttons
ratingRows.forEach(row => {
  const thumbsUpButton = row.querySelector('.thumbs-up');
  const thumbsDownButton = row.querySelector('.thumbs-down');
  thumbsUpButton.addEventListener('click', handleRatingClick);
  thumbsDownButton.addEventListener('click', handleRatingClick);
  if (row.querySelector('.kidfriendly')) {
    row.querySelector('.kidfriendly').addEventListener('click', toggleKidFriendly);
  }
});

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

        // Combine ratings and coordinates into a single object
        const allData = {
          ratings,
          coordinates: { latitude, longitude },
          freeformText: document.getElementById("freeform-input").value,
        };

        db.collection('ratings')
          .add({
            user_info: user_info,
            ratings: allData.ratings,
            coordinates: allData.coordinates,
            extra: allData.freeformText,
            timestamp: new Date().toISOString()
          })
          .then(() => {
            showToast('Thanks! Your rating has been recorded.', 'success');
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
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

