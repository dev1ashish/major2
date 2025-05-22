// DOM Elementsconst crashList = document.getElementById('crashList');const crashTitle = document.getElementById('crashTitle');const cameraIdEl = document.getElementById('cameraId');const frameIdEl = document.getElementById('frameId');const locationEl = document.getElementById('location');const crashTimeEl = document.getElementById('crashTime');const crashImage = document.getElementById('crashImage');const crashChart = document.getElementById('crashChart');const cityFilter = document.getElementById('cityFilter');const districtFilter = document.getElementById('districtFilter');const startDateFilter = document.getElementById('startDate');const endDateFilter = document.getElementById('endDate');const applyFiltersBtn = document.getElementById('applyFilters');// Latest crash elementsconst latestCrashImage = document.getElementById('latestCrashImage');const latestCameraId = document.getElementById('latestCameraId');const latestFrameId = document.getElementById('latestFrameId');const latestLocation = document.getElementById('latestLocation');const latestCrashTime = document.getElementById('latestCrashTime');const lastUpdatedTime = document.getElementById('lastUpdatedTime');

// State
let crashes = [];
let cities = new Set();
let districts = new Set();
let selectedCrash = null;
let chart = null;
let latestCrashId = null; // To track if a new crash has been detected
let pollingInterval = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
applyFiltersBtn.addEventListener('click', applyFilters);

// Functions
async function initialize() {
    try {
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
    // Update the latest crash section
    latestCameraId.textContent = crash.camera_id;
    latestFrameId.textContent = crash.frame_id;
    latestLocation.textContent = crash.city ? `${crash.city}${crash.district ? ', ' + crash.district : ''}` : 'Unknown';
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
            displayCrashDetails(crash);
        });
        
        crashList.appendChild(li);
    });
}

function displayCrashDetails(crash) {
    crashTitle.textContent = `Crash #${crash.camera_id}-${crash.frame_id}`;
    cameraIdEl.textContent = crash.camera_id;
    frameIdEl.textContent = crash.frame_id;
    locationEl.textContent = crash.city ? `${crash.city}${crash.district ? ', ' + crash.district : ''}` : 'Unknown';
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