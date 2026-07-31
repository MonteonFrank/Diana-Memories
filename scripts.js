let currentIndex = 0;
let images = [];
const preloadedImageUrls = new Set();
const FAVORITES_STORAGE_KEY = 'dianaMemoriesFavoritesV1';

document.addEventListener('DOMContentLoaded', () => {
  const photoAlbum = document.querySelector('.photo-album');
  const favoritesAlbum = document.getElementById('favorites-album');
  const clearFavoritesButton = document.getElementById('clear-favorites');
  setupMobileYearMenus();

  if (favoritesAlbum) {
    renderFavoritesGallery(favoritesAlbum);
  } else if (photoAlbum && photoAlbum.dataset.galleryJson) {
    renderJsonGallery(photoAlbum, photoAlbum.dataset.galleryJson);
  }

  if (clearFavoritesButton) {
    clearFavoritesButton.addEventListener('click', () => {
      clearFavorites();
      if (favoritesAlbum) {
        renderFavoritesGallery(favoritesAlbum);
        images = Array.from(document.querySelectorAll('.photo-album img'));
      }
    });
  }

  images = Array.from(document.querySelectorAll('.photo-album img'));

  if (images.length === 0 && (photoAlbum || favoritesAlbum)) {
    console.error('No images found in the gallery. Check your HTML structure.');
  }

  const lightbox = document.getElementById('lightbox');
  // Register swipe listeners once at startup instead of on every lightbox open.
  if (lightbox) {
    injectDesktopHint(lightbox);
    let startX = 0;

    lightbox.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      if (startX - endX > 50) {
        showNextImage();
      } else if (endX - startX > 50) {
        showPrevImage();
      }
    }, { passive: true });
  }

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

function setupMobileYearMenus() {
  const yearItems = Array.from(document.querySelectorAll('.nav-item-year'));

  if (yearItems.length === 0) {
    return;
  }

  const mobileQuery = window.matchMedia('(max-width: 768px)');

  const closeAllMenus = () => {
    yearItems.forEach((item) => {
      const button = item.querySelector('.nav-link-year');
      item.classList.remove('is-open');
      if (button) {
        button.setAttribute('aria-expanded', 'false');
      }
    });
  };

  const openFirstMenu = () => {
    const firstItem = yearItems[0];
    if (!firstItem) {
      return;
    }

    const firstButton = firstItem.querySelector('.nav-link-year');
    firstItem.classList.add('is-open');
    if (firstButton) {
      firstButton.setAttribute('aria-expanded', 'true');
    }
  };

  yearItems.forEach((item) => {
    const button = item.querySelector('.nav-link-year');

    if (!button) {
      return;
    }

    button.setAttribute('aria-expanded', 'false');

    button.addEventListener('click', (event) => {
      if (!mobileQuery.matches) {
        return;
      }

      event.preventDefault();
      const isOpen = item.classList.contains('is-open');
      closeAllMenus();

      if (!isOpen) {
        item.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  const syncMenuState = () => {
    closeAllMenus();
    if (mobileQuery.matches) {
      openFirstMenu();
    }
  };

  syncMenuState();

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', syncMenuState);
  } else {
    mobileQuery.addListener(syncMenuState);
  }
}

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
    galleryItems = normalizeGalleryItems(parsedData);
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
    const fullUrl = item.full || item.src || item.thumb;
    const thumbUrl = item.thumb || item.src || item.full;
    image.src = item.thumb || item.src || item.full;
    image.alt = item.alt || `Gallery image ${index + 1}`;
    image.loading = index < 4 ? 'eager' : 'lazy';
    image.fetchPriority = index === 0 ? 'high' : 'auto';
    image.decoding = 'async';
    image.dataset.index = String(index);
    image.dataset.full = fullUrl;

    if (item.width) {
      image.width = item.width;
    }

    if (item.height) {
      image.height = item.height;
    }

    image.addEventListener('click', () => enlargeImage(image));
    image.addEventListener('pointerenter', () => preloadImage(image.dataset.full));
    image.addEventListener('touchstart', () => preloadImage(image.dataset.full), { passive: true, once: true });

    const favoriteEntry = buildFavoriteEntry({
      full: fullUrl,
      thumb: thumbUrl,
      alt: image.alt,
    });

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'gallery-card';
    mediaWrapper.appendChild(buildFavoriteButton(favoriteEntry));

    if (item.thumbWebp) {
      const picture = document.createElement('picture');
      const webpSource = document.createElement('source');
      webpSource.type = 'image/webp';
      webpSource.srcset = item.thumbWebp;
      picture.appendChild(webpSource);
      picture.appendChild(image);
      mediaWrapper.appendChild(picture);
    } else {
      mediaWrapper.appendChild(image);
    }

    photoAlbum.appendChild(mediaWrapper);
  });
}

function normalizeGalleryItems(parsedData) {
  const galleryItems = Array.isArray(parsedData) ? parsedData : parsedData.images;

  if (!Array.isArray(galleryItems)) {
    return [];
  }

  const basePath = typeof parsedData?.basePath === 'string'
    ? parsedData.basePath.replace(/\/$/, '')
    : '';
  const thumbsPath = typeof parsedData?.thumbsPath === 'string'
    ? parsedData.thumbsPath.replace(/\/$/, '')
    : (basePath ? `${basePath}/thumbs` : '');
  const altPrefix = typeof parsedData?.altPrefix === 'string'
    ? parsedData.altPrefix
    : 'Gallery image';

  return galleryItems
    .map((item, index) => normalizeGalleryItem(item, index, basePath, thumbsPath, altPrefix))
    .filter(Boolean);
}

function normalizeGalleryItem(item, index, basePath, thumbsPath, altPrefix) {
  if (typeof item === 'string') {
    return {
      thumb: thumbsPath ? `${thumbsPath}/${item}` : item,
      full: basePath ? `${basePath}/${item}` : item,
      alt: `${altPrefix} ${index + 1}`,
    };
  }

  if (!item || typeof item !== 'object') {
    return null;
  }

  if (typeof item.file === 'string') {
    return {
      ...item,
      thumb: item.thumb || (thumbsPath ? `${thumbsPath}/${item.file}` : item.file),
      full: item.full || (basePath ? `${basePath}/${item.file}` : item.file),
      alt: item.alt || `${altPrefix} ${index + 1}`,
    };
  }

  return item;
}

function buildFavoriteButton(entry) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'favorite-toggle';
  button.title = 'Add to favorites';
  button.innerHTML = '&#9825;';

  const syncState = () => {
    const active = isFavorite(entry.id);
    button.classList.toggle('is-active', active);
    button.innerHTML = active ? '&#9829;' : '&#9825;';
    button.title = active ? 'Remove from favorites' : 'Add to favorites';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  };

  syncState();

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(entry);
    syncState();
  });

  return button;
}

function renderFavoritesGallery(container) {
  const favorites = getFavorites();
  const emptyState = document.getElementById('favorites-empty');
  const clearButton = document.getElementById('clear-favorites');

  container.innerHTML = '';

  if (favorites.length === 0) {
    if (emptyState) {
      emptyState.hidden = false;
    }
    if (clearButton) {
      clearButton.disabled = true;
    }
    return;
  }

  if (emptyState) {
    emptyState.hidden = true;
  }
  if (clearButton) {
    clearButton.disabled = false;
  }

  favorites.forEach((favorite, index) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    const image = document.createElement('img');
    image.src = favorite.thumb || favorite.full;
    image.alt = favorite.alt || `Favorite image ${index + 1}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.index = String(index);
    image.dataset.full = favorite.full;
    image.addEventListener('click', () => enlargeImage(image));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'favorite-toggle is-active';
    removeButton.title = 'Remove from favorites';
    removeButton.setAttribute('aria-pressed', 'true');
    removeButton.innerHTML = '&#9829;';
    removeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeFavoriteById(favorite.id);
      renderFavoritesGallery(container);
      images = Array.from(document.querySelectorAll('.photo-album img'));
    });

    card.appendChild(removeButton);
    card.appendChild(image);
    container.appendChild(card);
  });
}

function buildFavoriteEntry(imageMeta) {
  const albumTitle = document.querySelector('.header h1')?.textContent?.trim() || document.title;
  const full = toAbsoluteUrl(imageMeta.full);
  const thumb = toAbsoluteUrl(imageMeta.thumb || imageMeta.full);

  return {
    id: full,
    full,
    thumb,
    alt: imageMeta.alt || 'Favorite image',
    albumTitle,
    sourcePage: window.location.pathname,
    addedAt: Date.now(),
  };
}

function toAbsoluteUrl(path) {
  try {
    return new URL(path, window.location.href).href;
  } catch (_error) {
    return path;
  }
}

function getFavorites() {
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
  } catch (_error) {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item) => item && typeof item.id === 'string' && typeof item.full === 'string');
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

function isFavorite(id) {
  return getFavorites().some((favorite) => favorite.id === id);
}

function toggleFavorite(entry) {
  const favorites = getFavorites();
  const index = favorites.findIndex((favorite) => favorite.id === entry.id);

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.unshift(entry);
  }

  saveFavorites(favorites);
}

function removeFavoriteById(id) {
  const favorites = getFavorites().filter((favorite) => favorite.id !== id);
  saveFavorites(favorites);
}

function clearFavorites() {
  saveFavorites([]);
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
  preloadAdjacentImages();
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
  preloadAdjacentImages();
}

function preloadAdjacentImages() {
  if (images.length < 2) {
    return;
  }

  const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;

  preloadImage(images[nextIndex].dataset.full || images[nextIndex].src);
  preloadImage(images[prevIndex].dataset.full || images[prevIndex].src);
}

function preloadImage(url) {
  if (!url || preloadedImageUrls.has(url)) {
    return;
  }

  const preloadedImage = new Image();
  preloadedImage.decoding = 'async';
  preloadedImage.src = url;
  preloadedImageUrls.add(url);
}
