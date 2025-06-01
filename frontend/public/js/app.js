// DOM Elements
const crashList = document.getElementById('crashList');
const crashTitle = document.getElementById('crashTitle');
const crashTimeEl = document.getElementById('crashTime');
const crashImage = document.getElementById('crashImage');
const crashChart = document.getElementById('crashChart');
const cityFilter = document.getElementById('cityFilter');
const districtFilter = document.getElementById('districtFilter');
const startDateFilter = document.getElementById('startDate');
const endDateFilter = document.getElementById('endDate');
const applyFiltersBtn = document.getElementById('applyFilters');

// Latest crash elements
const latestCrashImage = document.getElementById('latestCrashImage');
const latestCrashTime = document.getElementById('latestCrashTime');
const lastUpdatedTime = document.getElementById('lastUpdatedTime');

// Action button elements
const latestApproveBtn = document.getElementById('latestApproveBtn');
const latestDisapproveBtn = document.getElementById('latestDisapproveBtn');
const detailApproveBtn = document.getElementById('detailApproveBtn');
const detailDisapproveBtn = document.getElementById('detailDisapproveBtn');

// Modal elements
const mapModal = document.getElementById('mapModal');
const closeModal = document.querySelector('.close-modal');
const modalCrashId = document.getElementById('modalCrashId');
const modalLocation = document.getElementById('modalLocation');
const modalTime = document.getElementById('modalTime');
const confirmLocationBtn = document.getElementById('confirmLocation');
const adjustLocationBtn = document.getElementById('adjustLocation');
const cancelModalBtn = document.getElementById('cancelModal');

// State
let crashes = [];
let cities = new Set();
let districts = new Set();
let selectedCrash = null;
let chart = null;
let latestCrashId = null; // To track if a new crash has been detected
let pollingInterval = null;
let map = null; // Leaflet map instance
let currentCrashForApproval = null; // Track which crash is being approved

// Dummy locations for different cities (latitude, longitude)
const dummyLocations = {
    // Major Indian cities coordinates
    'Mumbai': [19.0760, 72.8777],
    'Delhi': [28.7041, 77.1025],
    'Bangalore': [12.9716, 77.5946],
    'Hyderabad': [17.3850, 78.4867],
    'Chennai': [13.0827, 80.2707],
    'Kolkata': [22.5726, 88.3639],
    'Pune': [18.5204, 73.8567],
    'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873],
    'Surat': [21.1702, 72.8311],
    'Lucknow': [26.8467, 80.9462],
    'Kanpur': [26.4499, 80.3319],
    'Nagpur': [21.1458, 79.0882],
    'Indore': [22.7196, 75.8577],
    'Thane': [19.2183, 72.9781],
    'Bhopal': [23.2599, 77.4126],
    'Visakhapatnam': [17.6868, 83.2185],
    'Patna': [25.5941, 85.1376],
    'Vadodara': [22.3072, 73.1812],
    'Ghaziabad': [28.6692, 77.4538],
    'Ludhiana': [30.9010, 75.8573],
    'Agra': [27.1767, 78.0081],
    'Nashik': [19.9975, 73.7898],
    'Faridabad': [28.4089, 77.3178],
    'Meerut': [28.9845, 77.7064],
    'Rajkot': [22.3039, 70.8022],
    'Kalyan-Dombivali': [19.2402, 73.1305],
    'Vasai-Virar': [19.4912, 72.8054],
    'Varanasi': [25.3176, 82.9739],
    'Srinagar': [34.0837, 74.7973],
    'Aurangabad': [19.8762, 75.3433],
    'Dhanbad': [23.7957, 86.4304],
    'Amritsar': [31.6340, 74.8723],
    'Navi Mumbai': [19.0330, 73.0297],
    'Allahabad': [25.4358, 81.8463],
    
    // Keep fallback locations
    'Test City': [28.7041, 77.1025], // Default to Delhi coordinates
    'Unknown': [20.5937, 78.9629] // Center of India as fallback
};

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
applyFiltersBtn.addEventListener('click', applyFilters);

// Action button event listeners
latestApproveBtn.addEventListener('click', () => {
    console.log('Latest approve button clicked!');
    handleApprove('latest');
});
latestDisapproveBtn.addEventListener('click', () => handleDisapprove('latest'));
detailApproveBtn.addEventListener('click', () => {
    console.log('Detail approve button clicked!');
    handleApprove('detail');
});
detailDisapproveBtn.addEventListener('click', () => handleDisapprove('detail'));

// Modal event listeners
closeModal.addEventListener('click', closeMapModal);
cancelModalBtn.addEventListener('click', closeMapModal);
confirmLocationBtn.addEventListener('click', handleConfirmLocation);
adjustLocationBtn.addEventListener('click', handleAdjustLocation);

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === mapModal) {
        closeMapModal();
    }
});

// Functions
async function initialize() {
    try {
        console.log('Initializing application...');
        
        // Check if there's a specific crash in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const crashParam = urlParams.get('crash');
        
        if (crashParam) {
            console.log(`🔗 Loading specific crash from URL: ${crashParam}`);
            await loadSpecificCrash(crashParam);
        } else {
            // Start by getting the latest crash
            await fetchLatestCrash();
        }
        
        // Get all crashes for the list
        await fetchCrashes();
        populateFilters();
        renderCrashList();
        initializeChart();
        
        // Start polling for new crashes
        startPolling();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

function startPolling() {
    // Clear any existing interval
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Poll every 2 seconds for faster real-time updates
    pollingInterval = setInterval(fetchLatestCrash, 2000);
}

async function fetchLatestCrash() {
    try {
        console.log('Fetching latest crash...');
        const response = await fetch('/api/crashes/latest');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log('No crashes found in database');
                // Try fetching test data directly
                await fetchTestCrashData();
                return;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const crash = await response.json();
        console.log('Latest crash data:', crash);
        
        // Check if this is a new crash (different from what we're showing)
        const crashIdentifier = `${crash.camera_id}-${crash.frame_id}`;
        if (crashIdentifier !== latestCrashId) {
            latestCrashId = crashIdentifier;
            
            // Show notification that a new crash was detected
            console.log(`🚨 NEW CRASH DETECTED: ${crashIdentifier}`);
            
            // Add visual flash effect to indicate new crash
            const latestSection = document.querySelector('.latest-crash');
            if (latestSection) {
                latestSection.style.border = '3px solid #ff0000';
                latestSection.style.transition = 'border 0.5s ease';
                setTimeout(() => {
                    latestSection.style.border = '1px solid #ddd';
                }, 2000);
            }
            
            displayLatestCrash(crash);
            
            // If we have a new crash, refresh the entire crash list
            fetchCrashes().then(() => {
                populateFilters();
                renderCrashList();
                updateChart();
            });
        } else {
            console.log('No new crashes detected');
        }
    } catch (error) {
        console.error('Error fetching latest crash:', error);
        // Try fetching test data as fallback
        await fetchTestCrashData();
    }
}

async function loadSpecificCrash(crashParam) {
    try {
        // Parse crash parameter (format: camera_id-frame_id)
        const parts = crashParam.split('-');
        if (parts.length !== 2) {
            console.error('Invalid crash parameter format. Expected: camera_id-frame_id');
            return;
        }
        
        const [cameraId, frameId] = parts;
        console.log(`Loading crash: Camera ${cameraId}, Frame ${frameId}`);
        
        // Fetch the specific crash
        const response = await fetch(`/api/crashes/${cameraId}/${frameId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.error(`Crash ${crashParam} not found in database`);
                // Show an error message to user
                showCrashNotFoundMessage(crashParam);
                return;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const crash = await response.json();
        console.log('Loaded specific crash:', crash);
        
        // Display this crash as the latest
        latestCrashId = crashParam;
        displayLatestCrash(crash);
        
        // Add visual indication that this is from a link
        const latestSection = document.querySelector('.latest-crash');
        if (latestSection) {
            const linkIndicator = document.createElement('div');
            linkIndicator.style.cssText = `
                background: #4CAF50;
                color: white;
                padding: 5px 10px;
                margin-bottom: 10px;
                border-radius: 4px;
                font-size: 12px;
                text-align: center;
            `;
            linkIndicator.textContent = '🔗 Loaded from SMS Link';
            latestSection.insertBefore(linkIndicator, latestSection.firstChild);
        }
        
    } catch (error) {
        console.error('Error loading specific crash:', error);
        showCrashNotFoundMessage(crashParam);
    }
}

function showCrashNotFoundMessage(crashParam) {
    const latestSection = document.querySelector('.latest-crash');
    if (latestSection) {
        latestSection.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <h3>❌ Crash Not Found</h3>
                <p>Crash <strong>${crashParam}</strong> was not found in the database.</p>
                <p>It may have been removed or the link is invalid.</p>
            </div>
        `;
    }
}

// Fallback function to get test crash data if no real data exists
async function fetchTestCrashData() {
    console.log('Attempting to fetch hardcoded test crash data');
    
    try {
        // First try to get test data from database
        const response = await fetch('/api/crashes/9999/1');
        
        if (response.ok) {
            const crash = await response.json();
            console.log('Found test crash data:', crash);
            displayLatestCrash(crash);
            return;
        }
        
        // If no test data in database, show dummy data
        console.log('No test data found, showing dummy data');
        const dummyCrash = {
            camera_id: 9999,
            frame_id: 1,
            city: 'Test City',
            district: 'Test District',
            crash_time: new Date().toISOString(),
            imageUrl: '/api/crashes/9999/1/image'
        };
        displayLatestCrash(dummyCrash);
    } catch (error) {
        console.error('Error fetching test data:', error);
    }
}

function displayLatestCrash(crash) {
    // Update the latest crash section (only time now)
    latestCrashTime.textContent = formatDateTime(crash.crash_time);
    
    // Set the image source with cache-busting timestamp
    latestCrashImage.src = `/api/crashes/${crash.camera_id}/${crash.frame_id}/image?t=${Date.now()}`;
    latestCrashImage.alt = `Crash ${crash.camera_id}-${crash.frame_id} image`;
    
    // Add loading state
    latestCrashImage.style.opacity = '0.5';
    latestCrashImage.onload = function() {
        this.style.opacity = '1';
        console.log(`✅ Loaded crash image: ${crash.camera_id}-${crash.frame_id}`);
    };
    latestCrashImage.onerror = function() {
        console.error(`❌ Failed to load crash image: ${crash.camera_id}-${crash.frame_id}`);
        this.style.opacity = '1';
    };
    
    // Update the last updated time
    lastUpdatedTime.textContent = new Date().toLocaleTimeString();
    
    // Store current crash data for potential approval
    currentCrashForApproval = crash;
    console.log('Current crash for approval set:', currentCrashForApproval);
}

async function fetchCrashes() {
    try {
        const response = await fetch('/api/crashes');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        crashes = await response.json();
        
        // Extract unique cities and districts
        cities.clear();
        districts.clear();
        crashes.forEach(crash => {
            if (crash.city) cities.add(crash.city);
            if (crash.district) districts.add(crash.district);
        });
    } catch (error) {
        console.error('Error fetching crashes:', error);
        crashes = [];
    }
}

function populateFilters() {
    // Populate city filter
    cityFilter.innerHTML = '<option value="">All Cities</option>';
    Array.from(cities).sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
    
    // Populate district filter
    districtFilter.innerHTML = '<option value="">All Districts</option>';
    Array.from(districts).sort().forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtFilter.appendChild(option);
    });
}

function renderCrashList(filteredCrashes = null) {
    const crashesToRender = filteredCrashes || crashes;
    crashList.innerHTML = '';
    
    if (crashesToRender.length === 0) {
        const noResults = document.createElement('li');
        noResults.textContent = 'No crashes found';
        noResults.classList.add('no-results');
        crashList.appendChild(noResults);
        return;
    }
    
    crashesToRender.forEach(crash => {
        const li = document.createElement('li');
        const location = crash.city ? `${crash.city}${crash.district ? ', ' + crash.district : ''}` : 'Unknown Location';
        const time = formatDateTime(crash.crash_time);
        
        li.innerHTML = `
            <strong>ID: ${crash.camera_id}-${crash.frame_id}</strong><br>
            <span>${location}</span><br>
            <span>${time}</span>
        `;
        
        li.addEventListener('click', () => {
            // Deselect previous selection
            document.querySelectorAll('#crashList li.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Select current crash
            li.classList.add('selected');
            selectedCrash = crash;
            currentCrashForApproval = crash; // Update current crash for approval
            displayCrashDetails(crash);
        });
        
        crashList.appendChild(li);
    });
}

function displayCrashDetails(crash) {
    crashTitle.textContent = `Crash #${crash.camera_id}-${crash.frame_id}`;
    crashTimeEl.textContent = formatDateTime(crash.crash_time);
    
    // Load the crash image
    crashImage.src = `/api/crashes/${crash.camera_id}/${crash.frame_id}/image`;
    crashImage.alt = `Crash ${crash.camera_id}-${crash.frame_id} image`;
    
    // Update chart
    updateChart();
}

function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return 'Unknown';
    
    try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString();
    } catch {
        return dateTimeStr;
    }
}

function applyFilters() {
    const city = cityFilter.value;
    const district = districtFilter.value;
    const startDate = startDateFilter.value ? new Date(startDateFilter.value) : null;
    const endDate = endDateFilter.value ? new Date(endDateFilter.value) : null;
    
    // Apply filters
    const filteredCrashes = crashes.filter(crash => {
        // City filter
        if (city && crash.city !== city) return false;
        
        // District filter
        if (district && crash.district !== district) return false;
        
        // Date range filter
        if (startDate || endDate) {
            const crashDate = crash.crash_time ? new Date(crash.crash_time) : null;
            if (!crashDate) return false;
            
            if (startDate && crashDate < startDate) return false;
            if (endDate) {
                // Set end date to end of day
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (crashDate > endOfDay) return false;
            }
        }
        
        return true;
    });
    
    renderCrashList(filteredCrashes);
    updateChart(filteredCrashes);
}

function initializeChart() {
    const ctx = crashChart.getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Crashes by Location',
                data: [],
                backgroundColor: 'rgba(26, 35, 126, 0.7)',
                borderColor: 'rgba(26, 35, 126, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Initial chart update
    updateChart();
}

function updateChart(filteredCrashes = null) {
    const crashesToChart = filteredCrashes || crashes;
    
    // Count crashes by location
    const crashesByLocation = {};
    crashesToChart.forEach(crash => {
        const location = crash.city || 'Unknown';
        crashesByLocation[location] = (crashesByLocation[location] || 0) + 1;
    });
    
    // Update chart data
    const labels = Object.keys(crashesByLocation).sort();
    const data = labels.map(label => crashesByLocation[label]);
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

// Action button handlers
function handleApprove(source) {
    const crash = (source === 'latest') ? currentCrashForApproval : selectedCrash;
    
    console.log(`Handle approve called for source: ${source}`);
    console.log('Current crash for approval:', currentCrashForApproval);
    console.log('Selected crash:', selectedCrash);
    console.log('Final crash to approve:', crash);
    
    if (!crash) {
        alert('No crash selected for approval');
        console.error('No crash data available for approval');
        return;
    }
    
    console.log(`✅ Approving crash: ${crash.camera_id}-${crash.frame_id}`);
    
    // Show the map modal
    showMapModal(crash);
}

function handleDisapprove(source) {
    const crash = (source === 'latest') ? currentCrashForApproval : selectedCrash;
    
    if (!crash) {
        alert('No crash selected for disapproval');
        return;
    }
    
    console.log(`Disapproving crash: ${crash.camera_id}-${crash.frame_id}`);
    
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to disapprove crash ${crash.camera_id}-${crash.frame_id}?\n\nThis will mark the crash as a false positive.`);
    
    if (confirmed) {
        // Here you could add API call to update crash status
        alert(`Crash ${crash.camera_id}-${crash.frame_id} has been marked as disapproved`);
        
        // You could add visual indication or remove from list
        console.log('Crash disapproved:', crash);
    }
}

function showMapModal(crash) {
    console.log('🗺️ Opening map modal for crash:', crash);
    
    // Update modal content with crash info
    modalCrashId.textContent = `${crash.camera_id}-${crash.frame_id}`;
    modalLocation.textContent = crash.city ? `${crash.city}${crash.district ? ', ' + crash.district : ''}` : 'Unknown';
    modalTime.textContent = formatDateTime(crash.crash_time);
    
    // Show the modal
    mapModal.style.display = 'block';
    console.log('Modal display set to block');
    
    // Initialize the map after modal is visible
    setTimeout(() => {
        console.log('Initializing map...');
        initializeMap(crash);
    }, 300);
}

function initializeMap(crash) {
    console.log('🗺️ Initializing map for crash:', crash);
    
    // Get dummy coordinates for the crash location
    const city = crash.city || 'Unknown';
    const coordinates = dummyLocations[city] || dummyLocations['Unknown'];
    
    // Add some random offset to make it look more realistic
    const lat = coordinates[0] + (Math.random() - 0.5) * 0.01;
    const lng = coordinates[1] + (Math.random() - 0.5) * 0.01;
    
    console.log(`Map coordinates: ${lat}, ${lng} for city: ${city}`);
    
    // Clear existing map if it exists
    if (map) {
        console.log('Removing existing map instance');
        map.remove();
    }
    
    // Wait for DOM to be ready
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found!');
        return;
    }
    
    console.log('Creating Leaflet map...');
    
    try {
        // Initialize Leaflet map
        map = L.map('map').setView([lat, lng], 15);
        
        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Add marker for crash location
        const marker = L.marker([lat, lng]).addTo(map);
        
        // Add popup with crash info
        marker.bindPopup(`
            <div style="text-align: center;">
                <h4>🚨 Crash Location</h4>
                <p><strong>ID:</strong> ${crash.camera_id}-${crash.frame_id}</p>
                <p><strong>Time:</strong> ${formatDateTime(crash.crash_time)}</p>
                <p><strong>Location:</strong> ${crash.city || 'Unknown'}</p>
            </div>
        `).openPopup();
        
        // Add circle to show approximate area
        L.circle([lat, lng], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.3,
            radius: 100
        }).addTo(map);
        
        console.log(`✅ Map initialized successfully at coordinates: ${lat}, ${lng}`);
        
        // Force map to resize after initialization
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
        
    } catch (error) {
        console.error('Error initializing map:', error);
        alert('Error loading map. Please try again.');
    }
}

function closeMapModal() {
    console.log('Closing map modal');
    mapModal.style.display = 'none';
    
    // Clean up map instance
    if (map) {
        console.log('Cleaning up map instance');
        map.remove();
        map = null;
    }
}

function handleConfirmLocation() {
    const crash = currentCrashForApproval || selectedCrash;
    
    if (!crash) {
        alert('No crash data available');
        return;
    }
    
    console.log(`Location confirmed for crash: ${crash.camera_id}-${crash.frame_id}`);
    
    // Here you could add API call to update crash status as approved
    alert(`✅ Crash ${crash.camera_id}-${crash.frame_id} has been approved!\n\nLocation verified and emergency services will be notified.`);
    
    closeMapModal();
}

function handleAdjustLocation() {
    alert('📍 Location adjustment feature would allow you to drag the marker to the correct position.\n\nThis functionality can be implemented by making the marker draggable.');
    
    // You could implement draggable marker functionality here
    console.log('Adjust location requested');
} 