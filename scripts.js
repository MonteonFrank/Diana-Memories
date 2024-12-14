// Array to track all gallery images and the current index
let currentIndex = 0;
let images = [];

// Initialize the gallery images on page load
document.addEventListener('DOMContentLoaded', () => {
  images = Array.from(document.querySelectorAll('.photo-album img'));

  // Check if images are properly initialized
  if (images.length === 0) {
    console.error('No images found in the gallery. Check your HTML structure.');
  }
});

// Function to enlarge the image when clicked
function enlargeImage(imgElement) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  // Validate imgElement and ensure the `data-index` is available
  if (!imgElement || !imgElement.hasAttribute('data-index')) {
    console.error('Invalid image element or missing data-index attribute.');
    return;
  }

  // Get the index of the clicked image
  currentIndex = parseInt(imgElement.getAttribute('data-index'), 10);

  // Ensure currentIndex is valid
  if (isNaN(currentIndex) || currentIndex < 0 || currentIndex >= images.length) {
    console.error('Invalid index detected. Check your data-index values.');
    return;
  }

  // Set the lightbox image source dynamically
  lightboxImg.src = images[currentIndex].src;

  // Show the lightbox
  lightbox.style.display = 'flex';

  // Add swipe event listeners
  addSwipeListeners();
}

// Function to close the lightbox
function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  // Hide the lightbox and remove the image source
  lightbox.style.display = 'none';
  lightboxImg.removeAttribute('src');

  // Remove swipe event listeners
  removeSwipeListeners();
}

// Function to show the next image
function showNextImage() {
  if (currentIndex < images.length - 1) {
    currentIndex++;
  } else {
    currentIndex = 0; // Loop back to the first image
  }
  updateLightboxImage();
}

// Function to show the previous image
function showPrevImage() {
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    currentIndex = images.length - 1; // Loop to the last image
  }
  updateLightboxImage();
}

// Function to update the lightbox image
function updateLightboxImage() {
  const lightboxImg = document.getElementById('lightbox-img');
  lightboxImg.src = images[currentIndex].src;
}

// Add swipe event listeners
function addSwipeListeners() {
  const lightbox = document.getElementById('lightbox');
  let startX = 0;

  lightbox.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });

  lightbox.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;

    if (startX - endX > 50) {
      // Swipe left
      showNextImage();
    } else if (endX - startX > 50) {
      // Swipe right
      showPrevImage();
    }
  });
}

// Remove swipe event listeners
function removeSwipeListeners() {
  const lightbox = document.getElementById('lightbox');
  lightbox.removeEventListener('touchstart', () => {});
  lightbox.removeEventListener('touchend', () => {});
}
