let currentIndex = 0;
let images = [];

document.addEventListener('DOMContentLoaded', () => {
  const photoAlbum = document.querySelector('.photo-album');

  if (photoAlbum && photoAlbum.dataset.galleryJson) {
    renderJsonGallery(photoAlbum, photoAlbum.dataset.galleryJson);
  }

  images = Array.from(document.querySelectorAll('.photo-album img'));

  if (images.length === 0) {
    console.error('No images found in the gallery. Check your HTML structure.');
  }

  // Register swipe listeners once at startup instead of on every lightbox open
  const lightbox = document.getElementById('lightbox');
  injectDesktopHint(lightbox);
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

  // Desktop keyboard navigation only while lightbox is open.
  document.addEventListener('keydown', (event) => {
    if (!isLightboxOpen()) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNextImage();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrevImage();
    } else if (event.key === 'Escape') {
      closeLightbox();
    }
  });
});

function isLightboxOpen() {
  const lightbox = document.getElementById('lightbox');
  return Boolean(lightbox && getComputedStyle(lightbox).display !== 'none');
}

function injectDesktopHint(lightbox) {
  if (!lightbox || lightbox.querySelector('.lightbox-hint')) {
    return;
  }

  const hint = document.createElement('p');
  hint.className = 'lightbox-hint';
  hint.textContent = 'Use Left and Right arrows to navigate. Press Esc to close.';
  lightbox.appendChild(hint);
}

function renderJsonGallery(photoAlbum, scriptId) {
  const dataElement = document.getElementById(scriptId);

  if (!dataElement) {
    console.error(`Gallery JSON element not found: ${scriptId}`);
    return;
  }

  let galleryItems;

  try {
    const parsedData = JSON.parse(dataElement.textContent);
    galleryItems = Array.isArray(parsedData) ? parsedData : parsedData.images;
  } catch (error) {
    console.error('Failed to parse gallery JSON.', error);
    return;
  }

  if (!Array.isArray(galleryItems) || galleryItems.length === 0) {
    console.error('Gallery JSON does not contain any images.');
    return;
  }

  photoAlbum.innerHTML = '';

  galleryItems.forEach((item, index) => {
    const image = document.createElement('img');
    image.src = item.thumb || item.src || item.full;
    image.alt = item.alt || `Gallery image ${index + 1}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.index = String(index);
    image.dataset.full = item.full || item.src || item.thumb;

    if (item.width) {
      image.width = item.width;
    }

    if (item.height) {
      image.height = item.height;
    }

    image.addEventListener('click', () => enlargeImage(image));
    photoAlbum.appendChild(image);
  });
}

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

  lightboxImg.src = images[currentIndex].dataset.full || images[currentIndex].src;
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
  const activeImage = images[currentIndex];
  document.getElementById('lightbox-img').src = activeImage.dataset.full || activeImage.src;
}
