// Constants
const MAX_CANVAS_DIMENSION = 16384;
const SLIDER_CONFIG = {
    scale: {
        min: 10,
        max: 400,
        default: 100
    },
    quality: {
        min: 1,
        max: 100,
        default: 75
    }
};

// DOM Elements
const elements = {
    imageInput: document.getElementById('imageInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    previewImage: document.getElementById('previewImage'),
    uploadPrompt: document.getElementById('uploadPrompt'),
    controls: document.getElementById('controls'),
    widthInput: document.getElementById('widthInput'),
    heightInput: document.getElementById('heightInput'),
    widthSlider: document.getElementById('widthSlider'),
    heightSlider: document.getElementById('heightSlider'),
    widthSliderValue: document.getElementById('widthSliderValue'),
    heightSliderValue: document.getElementById('heightSliderValue'),
    aspectRatioCheckbox: document.getElementById('aspectRatio'),
    resizeBtn: document.getElementById('resizeBtn'),
    qualitySlider: document.getElementById('qualitySlider'),
    qualityValue: document.getElementById('qualityValue'),
    applyQualityBtn: document.getElementById('applyQualityBtn'),
    convertBtn: document.getElementById('convertBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    statusMessage: document.getElementById('statusMessage'),
    originalSizeSpan: document.getElementById('originalSize'),
    newSizeSpan: document.getElementById('newSize'),
    dimensionsSpan: document.getElementById('dimensions'),
    deleteBtn: document.getElementById('deleteImageBtn'),
    cropBtn: document.getElementById('cropBtn'),
    applyCropBtn: document.getElementById('applyCropBtn'),
    cancelCropBtn: document.getElementById('cancelCropBtn'),
    imageContainer: document.getElementById('imageContainer')
};

// State
let state = {
    originalImage: null,
    originalAspectRatio: 1,
    originalWidth: 0,
    originalHeight: 0,
    crop: {
        active: false,
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
        isDragging: false,
        isResizing: false,
        currentHandle: null,
        area: null,
        overlay: null
    }
};

// Event Listeners
function initializeEventListeners() {
    elements.uploadBtn.addEventListener('click', () => elements.imageInput.click());
    elements.imageInput.addEventListener('change', handleImageUpload);
    elements.widthInput.addEventListener('input', handleDimensionChange);
    elements.heightInput.addEventListener('input', handleDimensionChange);
    elements.widthSlider.addEventListener('input', handleSliderChange);
    elements.heightSlider.addEventListener('input', handleSliderChange);
    elements.resizeBtn.addEventListener('click', handleResize);
    elements.qualitySlider.addEventListener('input', updateQualityValue);
    elements.applyQualityBtn.addEventListener('click', handleQualityApply);
    elements.convertBtn.addEventListener('click', handleConvert);
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.deleteBtn.addEventListener('click', handleImageDelete);
    elements.aspectRatioCheckbox.addEventListener('change', handleAspectRatioChange);
    elements.cropBtn.addEventListener('click', startCrop);
    elements.applyCropBtn.addEventListener('click', applyCrop);
    elements.cancelCropBtn.addEventListener('click', cancelCrop);

    // Format change listeners
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', updateQualityValue);
    });
}

// Utility Functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getSelectedFormat() {
    return document.querySelector('input[name="format"]:checked')?.value || 'image/webp';
}

function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    elements.statusMessage.classList.remove('hidden');
    setTimeout(() => elements.statusMessage.classList.add('hidden'), 3000);
}

function updateSliderProgress(slider, value) {
    const percent = (value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--slider-progress', `${percent}%`);
}

// Core Functions
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            state.originalImage = new Image();
            state.originalImage.onload = async () => {
                elements.previewImage.src = event.target.result;
                elements.previewImage.style.display = 'block';
                elements.uploadPrompt.style.display = 'none';
                elements.controls.classList.remove('hidden');
                
                initializeDimensions();
                updateImageInfo(file.size);
                showStatus('Image loaded successfully!', 'success');
            };
            state.originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } catch (error) {
        showStatus('Error loading image!', 'error');
        console.error(error);
    }
}

function initializeDimensions() {
    state.originalWidth = state.originalImage.width;
    state.originalHeight = state.originalImage.height;
    state.originalAspectRatio = state.originalWidth / state.originalHeight;

    elements.widthInput.value = state.originalWidth;
    elements.heightInput.value = state.originalHeight;
    
    elements.widthSlider.value = SLIDER_CONFIG.scale.default;
    elements.heightSlider.value = SLIDER_CONFIG.scale.default;
    
    updateSliderValues();
    initializeQualitySlider();
}

function updateSliderValues() {
    const width = parseInt(elements.widthInput.value);
    const height = parseInt(elements.heightInput.value);
    
    const widthPercentage = Math.round((width / state.originalWidth) * 100);
    const heightPercentage = Math.round((height / state.originalHeight) * 100);
    
    elements.widthSliderValue.textContent = `${widthPercentage}%`;
    elements.heightSliderValue.textContent = `${heightPercentage}%`;
    
    updateSliderProgress(elements.widthSlider, widthPercentage);
    updateSliderProgress(elements.heightSlider, heightPercentage);
}

function initializeQualitySlider() {
    elements.qualitySlider.min = SLIDER_CONFIG.quality.min;
    elements.qualitySlider.max = SLIDER_CONFIG.quality.max;
    elements.qualitySlider.value = SLIDER_CONFIG.quality.default;
    updateQualityValue();
}

function updateQualityValue() {
    const value = elements.qualitySlider.value;
    elements.qualityValue.textContent = `${value}%`;
    updateSliderProgress(elements.qualitySlider, value);
    
    const format = getSelectedFormat();
    elements.qualitySlider.parentElement.style.display = 
        (format === 'image/jpeg' || format === 'image/webp') ? 'block' : 'none';
}

function handleDimensionChange(e) {
    if (!state.originalImage) return;

    const isWidth = e.target === elements.widthInput;
    let width = parseInt(elements.widthInput.value) || state.originalWidth;
    let height = parseInt(elements.heightInput.value) || state.originalHeight;

    // Check maximum dimensions
    if (width > MAX_CANVAS_DIMENSION) {
        width = MAX_CANVAS_DIMENSION;
        elements.widthInput.value = width;
        showStatus('Maximum width is 16384px', 'error');
    }
    if (height > MAX_CANVAS_DIMENSION) {
        height = MAX_CANVAS_DIMENSION;
        elements.heightInput.value = height;
        showStatus('Maximum height is 16384px', 'error');
    }

    if (elements.aspectRatioCheckbox.checked) {
        if (isWidth) {
            height = Math.round(width / state.originalAspectRatio);
            elements.heightInput.value = height;
        } else {
            width = Math.round(height * state.originalAspectRatio);
            elements.widthInput.value = width;
        }
    }

    updateSliderValues();
    updateDimensionsInfo();
}

function handleSliderChange(e) {
    if (!state.originalImage) return;
    
    const isWidth = e.target === elements.widthSlider;
    const value = parseInt(e.target.value);
    
    updateSliderProgress(e.target, value);
    
    if (isWidth) {
        const newWidth = Math.round((value / 100) * state.originalWidth);
        elements.widthInput.value = newWidth;
        
        if (elements.aspectRatioCheckbox.checked) {
            const newHeight = Math.round(newWidth / state.originalAspectRatio);
            elements.heightInput.value = newHeight;
            const heightPercentage = Math.round((newHeight / state.originalHeight) * 100);
            elements.heightSlider.value = heightPercentage;
            updateSliderProgress(elements.heightSlider, heightPercentage);
            elements.heightSliderValue.textContent = `${heightPercentage}%`;
        }
    } else {
        const newHeight = Math.round((value / 100) * state.originalHeight);
        elements.heightInput.value = newHeight;
        
        if (elements.aspectRatioCheckbox.checked) {
            const newWidth = Math.round(newHeight * state.originalAspectRatio);
            elements.widthInput.value = newWidth;
            const widthPercentage = Math.round((newWidth / state.originalWidth) * 100);
            elements.widthSlider.value = widthPercentage;
            updateSliderProgress(elements.widthSlider, widthPercentage);
            elements.widthSliderValue.textContent = `${widthPercentage}%`;
        }
    }
    
    updateDimensionsInfo();
}

async function handleResize() {
    if (!state.originalImage) return;
    
    try {
        const canvas = createResizedCanvas();
        const dataUrl = canvas.toDataURL(getSelectedFormat(), elements.qualitySlider.value / 100);
        elements.previewImage.src = dataUrl;
        
        const newSize = await getFileSize(dataUrl);
        updateImageInfo(newSize);
        showStatus('Image resized successfully!', 'success');
    } catch (error) {
        showStatus('Error resizing image!', 'error');
        console.error(error);
    }
}

async function handleQualityApply() {
    if (!state.originalImage) return;

    try {
        const canvas = createResizedCanvas();
        const format = getSelectedFormat();
        const quality = parseInt(elements.qualitySlider.value) / 100;
        
        const dataUrl = canvas.toDataURL(format, quality);
        elements.previewImage.src = dataUrl;
        
        const newSize = await getFileSize(dataUrl);
        elements.newSizeSpan.textContent = formatBytes(newSize);
        
        showStatus('Quality applied successfully!', 'success');
    } catch (error) {
        showStatus('Error applying quality!', 'error');
        console.error(error);
    }
}

async function handleConvert() {
    if (!state.originalImage) return;
    
    try {
        const canvas = createResizedCanvas();
        const format = getSelectedFormat();
        const quality = format === 'image/jpeg' || format === 'image/webp' ? 
            parseInt(elements.qualitySlider.value) / 100 : 1;
        
        const dataUrl = canvas.toDataURL(format, quality);
        elements.previewImage.src = dataUrl;
        
        const newSize = await getFileSize(dataUrl);
        updateImageInfo(newSize);
        showStatus('Format converted successfully!', 'success');
    } catch (error) {
        showStatus('Error converting format!', 'error');
        console.error(error);
    }
}

async function handleDownload() {
    if (!state.originalImage) return;

    try {
        const width = parseInt(elements.widthInput.value);
        const height = parseInt(elements.heightInput.value);

        if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
            showStatus('Image dimensions too large. Maximum allowed is 16384px', 'error');
            return;
        }

        const canvas = createResizedCanvas();
        const format = getSelectedFormat();
        const dataUrl = canvas.toDataURL(format, parseInt(elements.qualitySlider.value) / 100);
        
        const link = document.createElement('a');
        link.download = `edited_image.${format.split('/')[1]}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('Image downloaded successfully!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showStatus('Error downloading image. Try reducing dimensions.', 'error');
    }
}

function handleImageDelete() {
    cancelCrop();
    state.originalImage = null;
    elements.previewImage.src = '';
    elements.previewImage.style.display = 'none';
    elements.uploadPrompt.style.display = 'flex';
    elements.controls.classList.add('hidden');
    elements.imageInput.value = '';
    resetImageInfo();
}

function handleAspectRatioChange() {
    if (elements.aspectRatioCheckbox.checked && state.originalImage) {
        const currentWidth = parseInt(elements.widthInput.value);
        const newHeight = Math.round(currentWidth / state.originalAspectRatio);
        elements.heightInput.value = newHeight;
        updateSliderValues();
        updateDimensionsInfo();
    }
}

// Crop Functions
function startCrop() {
    if (!state.originalImage) return;
    
    state.crop.active = true;
    elements.imageContainer.classList.add('cropping');
    elements.cropBtn.style.display = 'none';
    elements.applyCropBtn.style.display = 'block';
    elements.cancelCropBtn.style.display = 'block';
    
    // Create overlay
    state.crop.overlay = document.createElement('div');
    state.crop.overlay.className = 'crop-overlay';
    elements.imageContainer.appendChild(state.crop.overlay);
    
    elements.imageContainer.addEventListener('mousedown', startCropSelection);
}

function startCropSelection(e) {
    if (!state.crop.active) return;
    
    const rect = elements.imageContainer.getBoundingClientRect();
    state.crop.start = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    state.crop.isDragging = true;
    
    if (!state.crop.area) {
        state.crop.area = document.createElement('div');
        state.crop.area.className = 'crop-area';
        elements.imageContainer.appendChild(state.crop.area);
        
        // Add resize handles
        const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        handles.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `crop-handle ${pos}`;
            handle.dataset.handle = pos;
            state.crop.area.appendChild(handle);
            
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                state.crop.isResizing = true;
                state.crop.currentHandle = pos;
            });
        });
    }
    
    document.addEventListener('mousemove', updateCropSelection);
    document.addEventListener('mouseup', endCropSelection);
}

function updateCropSelection(e) {
    if (!state.crop.isDragging && !state.crop.isResizing) return;
    
    const rect = elements.imageContainer.getBoundingClientRect();
    state.crop.end = {
        x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
        y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height)
    };
    
    if (state.crop.isDragging) {
        updateCropArea();
    } else if (state.crop.isResizing) {
        resizeCropArea(e, rect);
    }
}

function updateCropArea() {
    const width = Math.abs(state.crop.end.x - state.crop.start.x);
    const height = Math.abs(state.crop.end.y - state.crop.start.y);
    const left = Math.min(state.crop.start.x, state.crop.end.x);
    const top = Math.min(state.crop.start.y, state.crop.end.y);
    
    state.crop.area.style.width = `${width}px`;
    state.crop.area.style.height = `${height}px`;
    state.crop.area.style.left = `${left}px`;
    state.crop.area.style.top = `${top}px`;
}

function resizeCropArea(e, containerRect) {
    const cropRect = state.crop.area.getBoundingClientRect();
    
    let newLeft = cropRect.left - containerRect.left;
    let newTop = cropRect.top - containerRect.top;
    let newWidth = cropRect.width;
    let newHeight = cropRect.height;
    
    switch (state.crop.currentHandle) {
        case 'nw':
            newWidth = cropRect.right - e.clientX;
            newHeight = cropRect.bottom - e.clientY;
            newLeft = e.clientX - containerRect.left;
            newTop = e.clientY - containerRect.top;
            break;
        case 'n':
            newHeight = cropRect.bottom - e.clientY;
            newTop = e.clientY - containerRect.top;
            break;
        case 'ne':
            newWidth = e.clientX - cropRect.left;
            newHeight = cropRect.bottom - e.clientY;
            newTop = e.clientY - containerRect.top;
            break;
        case 'w':
            newWidth = cropRect.right - e.clientX;
            newLeft = e.clientX - containerRect.left;
            break;
        case 'e':
            newWidth = e.clientX - cropRect.left;
            break;
        case 'sw':
            newWidth = cropRect.right - e.clientX;
            newHeight = e.clientY - cropRect.top;
            newLeft = e.clientX - containerRect.left;
            break;
        case 's':
            newHeight = e.clientY - cropRect.top;
            break;
        case 'se':
            newWidth = e.clientX - cropRect.left;
            newHeight = e.clientY - cropRect.top;
            break;
    }
    
    // Apply constraints
    newLeft = Math.max(0, Math.min(newLeft, containerRect.width - 10));
    newTop = Math.max(0, Math.min(newTop, containerRect.height - 10));
    newWidth = Math.max(20, Math.min(newWidth, containerRect.width - newLeft));
    newHeight = Math.max(20, Math.min(newHeight, containerRect.height - newTop));
    
    state.crop.area.style.left = `${newLeft}px`;
    state.crop.area.style.top = `${newTop}px`;
    state.crop.area.style.width = `${newWidth}px`;
    state.crop.area.style.height = `${newHeight}px`;
}

function endCropSelection() {
    state.crop.isDragging = false;
    state.crop.isResizing = false;
    state.crop.currentHandle = null;
    document.removeEventListener('mousemove', updateCropSelection);
    document.removeEventListener('mouseup', endCropSelection);
}

async function applyCrop() {
    if (!state.crop.area) return;
    
    try {
        const containerRect = elements.imageContainer.getBoundingClientRect();
        const cropRect = state.crop.area.getBoundingClientRect();
        const imageRect = elements.previewImage.getBoundingClientRect();
        
        // Calculate the scaling factor between displayed image and original image
        const scaleX = state.originalImage.width / imageRect.width;
        const scaleY = state.originalImage.height / imageRect.height;
        
        // Calculate the crop area in original image coordinates
        const sourceX = (cropRect.left - imageRect.left) * scaleX;
        const sourceY = (cropRect.top - imageRect.top) * scaleY;
        const sourceWidth = cropRect.width * scaleX;
        const sourceHeight = cropRect.height * scaleY;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        
        ctx.drawImage(state.originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, canvas.width, canvas.height
        );
        
        const format = getSelectedFormat();
        const quality = parseInt(elements.qualitySlider.value) / 100;
        const dataUrl = canvas.toDataURL(format, quality);
        
        // Update image
        const croppedImage = new Image();
        croppedImage.onload = () => {
            state.originalImage = croppedImage;
            elements.previewImage.src = croppedImage.src;
            
            // Update dimensions
            elements.widthInput.value = croppedImage.width;
            elements.heightInput.value = croppedImage.height;
            state.originalAspectRatio = croppedImage.width / croppedImage.height;
            state.originalWidth = croppedImage.width;
            state.originalHeight = croppedImage.height;
            
            // Reset crop interface
            cancelCrop();
            updateDimensionsInfo();
            showStatus('Image cropped successfully!', 'success');
        };
        croppedImage.src = dataUrl;
    } catch (error) {
        showStatus('Error cropping image!', 'error');
        console.error(error);
    }
}

function cancelCrop() {
    state.crop.active = false;
    elements.imageContainer.classList.remove('cropping');
    elements.cropBtn.style.display = 'block';
    elements.applyCropBtn.style.display = 'none';
    elements.cancelCropBtn.style.display = 'none';
    
    if (state.crop.area) {
        state.crop.area.remove();
        state.crop.area = null;
    }
    if (state.crop.overlay) {
        state.crop.overlay.remove();
        state.crop.overlay = null;
    }
    
    elements.imageContainer.removeEventListener('mousedown', startCropSelection);
}

// Helper Functions
function createResizedCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = parseInt(elements.widthInput.value);
    canvas.height = parseInt(elements.heightInput.value);
    
    ctx.drawImage(elements.previewImage, 0, 0, canvas.width, canvas.height);
    return canvas;
}

async function getFileSize(dataUrl) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return blob.size;
}

function updateImageInfo(size) {
    elements.originalSizeSpan.textContent = formatBytes(size);
    elements.newSizeSpan.textContent = formatBytes(size);
    updateDimensionsInfo();
}

function updateDimensionsInfo() {
    elements.dimensionsSpan.textContent = 
        `${elements.widthInput.value}×${elements.heightInput.value}`;
}

function resetImageInfo() {
    elements.originalSizeSpan.textContent = '-';
    elements.newSizeSpan.textContent = '-';
    elements.dimensionsSpan.textContent = '-';
}

// Initialize
initializeEventListeners();
