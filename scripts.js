// Function to enlarge the image when clicked
function enlargeImage(imgElement) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  // Set the lightbox image source dynamically
  lightboxImg.src = imgElement.src;

  // Show the lightbox and the image
  lightbox.style.display = 'flex';
  lightboxImg.style.display = 'block';
}

// Function to close the lightbox
function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  // Hide the lightbox and remove the image source
  lightbox.style.display = 'none';
  lightboxImg.style.display = 'none';
  lightboxImg.removeAttribute('src'); // Completely remove the src attribute
}
