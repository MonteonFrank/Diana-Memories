let currentIndex = 0;
let images = [];

document.addEventListener('DOMContentLoaded', () => {
  images = Array.from(document.querySelectorAll('.photo-album img'));

  if (images.length === 0) {
    console.error('No images found in the gallery. Check your HTML structure.');
  }

  // Register swipe listeners once at startup instead of on every lightbox open
  const lightbox = document.getElementById('lightbox');
  let startX = 0;

  lightbox.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });

  lightbox.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    if (startX - endX > 50) {
      showNextImage();
    } else if (endX - startX > 50) {
      showPrevImage();
    }
  });
});

function enlargeImage(imgElement) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  if (!imgElement || !imgElement.hasAttribute('data-index')) {
    console.error('Invalid image element or missing data-index attribute.');
    return;
  }

  currentIndex = parseInt(imgElement.getAttribute('data-index'), 10);

  if (isNaN(currentIndex) || currentIndex < 0 || currentIndex >= images.length) {
    console.error('Invalid index detected. Check your data-index values.');
    return;
  }

  lightboxImg.src = images[currentIndex].src;
  lightbox.style.display = 'flex';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  lightbox.style.display = 'none';
  lightboxImg.removeAttribute('src');
}

function showNextImage() {
  currentIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
  updateLightboxImage();
}

function showPrevImage() {
  currentIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
  updateLightboxImage();
}

function updateLightboxImage() {
  document.getElementById('lightbox-img').src = images[currentIndex].src;
}
