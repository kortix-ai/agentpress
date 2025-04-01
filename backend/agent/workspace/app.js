// Mapbox access token
const mapboxAccessToken = 'pk.eyJ1IjoibWFya29rcmFlbWVyIiwiYSI6ImNscGRrMWY5bTEzMDMyaHJsM3Nmc2VmYzUifQ.CxA8xsQ5iSMxUhP86oYUmg';

// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const pickupInput = document.getElementById('pickupLocation');
const destinationInput = document.getElementById('destinationLocation');
const searchLocationResults = document.getElementById('searchLocationResults');
const rideOptions = document.getElementById('rideOptions');
const driverPanel = document.getElementById('driverPanel');
const requestRideBtn = document.querySelector('.request-ride-btn');
const cancelTripBtn = document.querySelector('.cancel-trip-btn');
const rideTypes = document.querySelectorAll('.ride-type');
const tripHistoryBtn = document.getElementById('tripHistoryBtn');
const tripHistoryPanel = document.getElementById('tripHistoryPanel');
const backToRideBtn = document.getElementById('backToRide');
const scheduleRideBtn = document.getElementById('scheduleRideBtn');
const schedulePanel = document.getElementById('schedulePanel');
const paymentMethodBtn = document.getElementById('paymentMethodBtn');
const paymentMethodsPanel = document.getElementById('paymentMethodsPanel');
const closePaymentPanel = document.getElementById('closePaymentPanel');
const ratingPanel = document.getElementById('ratingPanel');
const ratingStars = document.querySelectorAll('.rating-star');
const submitRatingBtn = document.getElementById('submitRating');
const promoCodeInput = document.getElementById('promoCodeInput');
const applyPromoBtn = document.getElementById('applyPromoBtn');
const promoContainer = document.getElementById('promoContainer');
const selectedPaymentMethod = document.getElementById('selectedPaymentMethod');

// Global variables
let map;
let userMarker;
let destinationMarker;
let routeLine;
let driverMarker;
let currentRating = 0;
let currentTrip = null;
let liveTracking = null;
let currentRouteData = null;
let tripHistory = [
    {
        id: 'trip-001',
        date: new Date(Date.now() - 86400000), // Yesterday
        pickup: 'Times Square',
        destination: 'Central Park',
        driver: 'Sarah Johnson',
        car: 'Honda Civic · White',
        licensePlate: 'XYZ 789',
        price: 18.75,
        rideType: 'UberX',
        rating: 5
    },
    {
        id: 'trip-002',
        date: new Date(Date.now() - 172800000), // 2 days ago
        pickup: 'Grand Central Terminal',
        destination: 'Brooklyn Bridge',
        driver: 'Robert Smith',
        car: 'Toyota Prius · Silver',
        licensePlate: 'ABC 456',
        price: 24.50,
        rideType: 'Comfort',
        rating: 4
    }
];

// Initialize map
function initMap() {
    mapboxgl.accessToken = mapboxAccessToken;
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-74.5, 40], // Default location (New York)
        zoom: 12
    });
    
    // Add time of day control to switch between day and night mode
    const timeOfDayControl = document.createElement('div');
    timeOfDayControl.className = 'mapboxgl-ctrl mapboxgl-ctrl-group time-of-day-control';
    timeOfDayControl.innerHTML = `
        <button type="button" title="Toggle day/night mode">
            <i class="fas fa-moon"></i>
        </button>
    `;
    timeOfDayControl.style.margin = '10px';
    
    // Add click event to toggle between day and night map styles
    timeOfDayControl.querySelector('button').addEventListener('click', () => {
        const currentStyle = map.getStyle().name;
        const icon = timeOfDayControl.querySelector('i');
        
        if (currentStyle.includes('Dark') || currentStyle.includes('Night')) {
            map.setStyle('mapbox://styles/mapbox/streets-v11');
            icon.className = 'fas fa-moon';
        } else {
            map.setStyle('mapbox://styles/mapbox/navigation-night-v1');
            icon.className = 'fas fa-sun';
        }
    });
    
    document.querySelector('.map-container').appendChild(timeOfDayControl);

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Add geolocation control
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    }), 'bottom-right');
    
    // Add loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'map-loading';
    loadingEl.innerHTML = '<div class="spinner"></div><p>Loading map...</p>';
    loadingEl.style.position = 'absolute';
    loadingEl.style.top = '0';
    loadingEl.style.left = '0';
    loadingEl.style.right = '0';
    loadingEl.style.bottom = '0';
    loadingEl.style.backgroundColor = 'rgba(255,255,255,0.8)';
    loadingEl.style.display = 'flex';
    loadingEl.style.flexDirection = 'column';
    loadingEl.style.alignItems = 'center';
    loadingEl.style.justifyContent = 'center';
    loadingEl.style.zIndex = '100';
    
    const spinner = loadingEl.querySelector('.spinner');
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.border = '4px solid #f3f3f3';
    spinner.style.borderTop = '4px solid #276EF1';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 1s linear infinite';
    
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    document.getElementById('map').appendChild(loadingEl);
    
    map.on('load', () => {
        // Remove loading indicator when map is loaded
        setTimeout(() => {
            loadingEl.style.opacity = '0';
            loadingEl.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                loadingEl.remove();
            }, 500);
        }, 500);
        
        // Add custom user location marker
        setTimeout(() => {
            // This would normally come from the browser's geolocation API
            const userLocation = [-74.006, 40.7128]; // New York City coordinates
            
            // Create a custom marker element for user location
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.style.width = '22px';
            el.style.height = '22px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#276EF1';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
            
            // Add pulse effect
            const pulseEl = document.createElement('div');
            pulseEl.className = 'marker-pulse';
            el.appendChild(pulseEl);
            
            // Add marker for user's location
            userMarker = new mapboxgl.Marker(el)
                .setLngLat(userLocation)
                .addTo(map);
            
            // Center map on user's location
            map.flyTo({
                center: userLocation,
                zoom: 14,
                essential: true
            });
            
            // Simulate setting pickup location to current location
            pickupInput.value = "Current Location";
            
            // Add weather widget
            const weatherService = new WeatherService();
            weatherService.getWeather(userLocation[1], userLocation[0])
                .then(weatherData => {
                    const weatherWidget = weatherService.createWeatherWidget(weatherData);
                    document.querySelector('.map-container').appendChild(weatherWidget);
                });
        }, 1000);
    });

    return map;
}

// Event Listeners
function setupEventListeners() {
    // Sidebar toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
    });

    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            e.target !== menuToggle) {
            sidebar.classList.remove('active');
        }
    });

    // Location search
    destinationInput.addEventListener('focus', () => {
        showLocationSearchResults();
    });

    destinationInput.addEventListener('input', () => {
        if (destinationInput.value.trim() !== '') {
            showLocationSearchResults();
        } else {
            searchLocationResults.classList.add('hidden');
        }
    });

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== destinationInput && !searchLocationResults.contains(e.target)) {
            searchLocationResults.classList.add('hidden');
        }
    });

    // Select ride type
    rideTypes.forEach(ride => {
        ride.addEventListener('click', () => {
            // Remove selected class from all ride types
            rideTypes.forEach(r => r.classList.remove('selected'));
            
            // Add selected class to clicked ride type
            ride.classList.add('selected');
            
            // Update request button text
            const rideTypeName = ride.querySelector('h4').textContent;
            requestRideBtn.textContent = `Request ${rideTypeName}`;
        });
    });

    // Request ride button
    requestRideBtn.addEventListener('click', () => {
        rideOptions.classList.add('hidden');
        driverPanel.classList.remove('hidden');
        
        // Create current trip object
        currentTrip = {
            id: generateTripId(),
            date: new Date(),
            pickup: pickupInput.value,
            destination: destinationInput.value,
            driver: "Michael Johnson",
            car: "Toyota Camry · Black",
            licensePlate: "ABC 123",
            price: getSelectedRidePrice(),
            rideType: getSelectedRideType(),
            rating: 0
        };
        
        // Simulate driver approaching
        simulateDriverApproaching();
    });

    // Cancel trip button
    cancelTripBtn.addEventListener('click', () => {
        showToast("Trip cancelled");
        driverPanel.classList.add('hidden');
        rideOptions.classList.remove('hidden');
        
        // Remove driver marker and route
        if (driverMarker) {
            driverMarker.remove();
            driverMarker = null;
        }
        
        if (routeLine && map.getSource('route')) {
            map.removeLayer('route');
            map.removeSource('route');
            routeLine = null;
        }
        
        currentTrip = null;
    });

    // Saved places
    const savedPlaces = document.querySelectorAll('.saved-place');
    savedPlaces.forEach(place => {
        place.addEventListener('click', () => {
            const placeType = place.querySelector('span').textContent;
            destinationInput.value = placeType;
            
            // Show ride options
            searchLocationResults.classList.add('hidden');
            rideOptions.classList.remove('hidden');
            
            // Simulate route
            simulateRoute();
        });
    });
    
    // Trip history button
    tripHistoryBtn.addEventListener('click', () => {
        sidebar.classList.remove('active');
        showTripHistory();
    });
    
    // Back to ride button
    if (backToRideBtn) {
        backToRideBtn.addEventListener('click', () => {
            tripHistoryPanel.classList.add('hidden');
            schedulePanel.classList.add('hidden');
        });
    }
    
    // Schedule ride button
    scheduleRideBtn.addEventListener('click', () => {
        schedulePanel.classList.remove('hidden');
        document.getElementById('schedulePickup').textContent = pickupInput.value;
        document.getElementById('scheduleDestination').textContent = destinationInput.value || "Enter destination";
    });
    
    // Confirm schedule button
    document.getElementById('confirmSchedule').addEventListener('click', () => {
        const scheduleDate = document.getElementById('scheduleDate').value;
        const scheduleTime = document.getElementById('scheduleTime').value;
        
        if (scheduleDate && scheduleTime) {
            showToast("Ride scheduled successfully");
            schedulePanel.classList.add('hidden');
            
            // In a real app, you would save this scheduled ride
            console.log(`Ride scheduled for ${scheduleDate} at ${scheduleTime}`);
        } else {
            showToast("Please select date and time");
        }
    });
    
    // Payment method button
    paymentMethodBtn.addEventListener('click', () => {
        showPaymentMethods();
    });
    
    // Close payment panel
    closePaymentPanel.addEventListener('click', () => {
        paymentMethodsPanel.classList.add('hidden');
    });
    
    // Rating stars
    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1;
            updateRatingStars();
        });
        
        star.addEventListener('mouseover', () => {
            // Temporarily show stars up to the hovered one
            ratingStars.forEach((s, i) => {
                if (i <= index) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
        
        star.addEventListener('mouseout', () => {
            // Restore the actual rating
            updateRatingStars();
        });
    });
    
    // Submit rating
    submitRatingBtn.addEventListener('click', () => {
        if (currentRating > 0 && currentTrip) {
            currentTrip.rating = currentRating;
            tripHistory.unshift(currentTrip); // Add to beginning of history
            
            // Show confetti for 5-star ratings
            if (currentRating === 5) {
                const confetti = new Confetti();
                confetti.start();
            }
            
            showToast(`Thank you for your ${currentRating}-star rating!`);
            ratingPanel.classList.add('hidden');
            currentTrip = null;
            currentRating = 0;
        } else {
            showToast("Please select a rating");
        }
    });
    
    // Apply promo code
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', () => {
            const promoCode = promoCodeInput.value.trim();
            if (promoCode) {
                applyPromoCode(promoCode);
                promoCodeInput.value = '';
            }
        });
    }
    
    // Add payment method
    document.getElementById('addPaymentMethod').addEventListener('click', () => {
        // In a real app, this would open a form to add a new payment method
        showToast("Payment method form would open here");
    });
}

// Show location search results
function showLocationSearchResults() {
    // Clear previous results
    searchLocationResults.innerHTML = '';
    searchLocationResults.classList.remove('hidden');
    
    const searchTerm = destinationInput.value.trim().toLowerCase();
    
    // Sample locations
    const locations = [
        { name: "Times Square", address: "Manhattan, NY 10036", icon: "fa-map-marker-alt" },
        { name: "Central Park", address: "Manhattan, NY 10024", icon: "fa-tree" },
        { name: "Empire State Building", address: "20 W 34th St, NY 10001", icon: "fa-building" },
        { name: "Brooklyn Bridge", address: "Brooklyn Bridge, NY 10038", icon: "fa-archway" },
        { name: "Grand Central Terminal", address: "89 E 42nd St, NY 10017", icon: "fa-train" }
    ];
    
    // Filter locations based on search term
    const filteredLocations = locations.filter(location => 
        location.name.toLowerCase().includes(searchTerm) || 
        location.address.toLowerCase().includes(searchTerm) ||
        searchTerm === ''
    );
    
    if (filteredLocations.length === 0) {
        searchLocationResults.innerHTML = `
            <div class="no-results">
                No locations found. Try a different search.
            </div>
        `;
    } else {
        filteredLocations.forEach(location => {
            const locationElement = document.createElement('div');
            locationElement.className = 'location-result';
            locationElement.innerHTML = `
                <div class="location-icon">
                    <i class="fas ${location.icon}"></i>
                </div>
                <div class="location-details">
                    <div class="location-name">${location.name}</div>
                    <div class="location-address">${location.address}</div>
                </div>
            `;
            
            locationElement.addEventListener('click', () => {
                destinationInput.value = location.name;
                searchLocationResults.classList.add('hidden');
                rideOptions.classList.remove('hidden');
                
                // Simulate route
                simulateRoute(location.name);
            });
            
            searchLocationResults.appendChild(locationElement);
        });
    }
}

// Simulate route on map
async function simulateRoute(destination = null) {
    // In a real app, this would call a routing API to get directions
    console.log('Simulating route from pickup to destination');
    
    const destinationName = destination || destinationInput.value;
    
    // Sample destination coordinates based on name
    let destinationCoords;
    switch(destinationName.toLowerCase()) {
        case 'times square':
            destinationCoords = [-73.9855, 40.7580];
            break;
        case 'central park':
            destinationCoords = [-73.9665, 40.7812];
            break;
        case 'empire state building':
            destinationCoords = [-73.9857, 40.7484];
            break;
        case 'brooklyn bridge':
            destinationCoords = [-73.9969, 40.7061];
            break;
        case 'grand central terminal':
            destinationCoords = [-73.9772, 40.7527];
            break;
        case 'work':
            destinationCoords = [-73.9787, 40.7500];
            break;
        case 'home':
            destinationCoords = [-73.9664, 40.7605];
            break;
        default:
            // Random location near user
            const userCoords = userMarker.getLngLat();
            destinationCoords = [
                userCoords.lng + (Math.random() * 0.02 - 0.01),
                userCoords.lat + (Math.random() * 0.02 - 0.01)
            ];
    }
    
    // Add destination marker
    if (destinationMarker) {
        destinationMarker.remove();
    }
    
    // Create a custom marker element
    const el = document.createElement('div');
    el.className = 'destination-marker';
    el.innerHTML = '<i class="fas fa-map-marker-alt" style="color: #000; font-size: 24px;"></i>';
    el.style.marginTop = '-24px'; // Offset to position the marker correctly
    
    destinationMarker = new mapboxgl.Marker(el)
        .setLngLat(destinationCoords)
        .addTo(map);
    
    // Create a simple route using our directions helper
    const userCoords = userMarker.getLngLat();
    
    // Remove existing route if any
    if (routeLine && map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
    }
    
    try {
        // Use our directions helper to get a more realistic route
        const directions = new MapboxDirections(mapboxAccessToken);
        const routeData = await directions.getRoute(
            [userCoords.lng, userCoords.lat],
            destinationCoords
        );
        
        // Add the route line
        map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': routeData.routes[0].geometry
            }
        });
        
        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#276EF1',
                'line-width': 4
            }
        });
        
        routeLine = true;
        
        // Store route data for later use
        currentRouteData = routeData;
        
        // Calculate and display estimated time and distance
        const distance = (routeData.routes[0].distance / 1000).toFixed(1); // km
        const duration = Math.round(routeData.routes[0].duration / 60); // minutes
        
        // Update ride options with ETA
        document.querySelectorAll('.ride-type p').forEach(el => {
            const baseText = el.textContent.split('·')[1] || '';
            el.textContent = `${duration} min away · ${baseText.trim()}`;
        });
        
        // Show distance and ETA in a tooltip
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'route-tooltip';
        tooltipEl.innerHTML = `
            <div style="background-color: white; padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); font-size: 14px;">
                <div style="font-weight: 500;">${duration} min (${distance} km)</div>
                <div style="color: #757575; font-size: 12px;">Estimated trip time</div>
            </div>
        `;
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.top = '50%';
        tooltipEl.style.left = '50%';
        tooltipEl.style.transform = 'translate(-50%, -50%)';
        tooltipEl.style.zIndex = '100';
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.opacity = '0';
        tooltipEl.style.transition = 'opacity 0.3s ease';
        
        document.querySelector('.map-container').appendChild(tooltipEl);
        
        setTimeout(() => {
            tooltipEl.style.opacity = '1';
            
            setTimeout(() => {
                tooltipEl.style.opacity = '0';
                setTimeout(() => tooltipEl.remove(), 300);
            }, 3000);
        }, 300);
        
    } catch (error) {
        console.error('Error generating route:', error);
        
        // Fallback to simple straight line if directions fail
        map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [
                        [userCoords.lng, userCoords.lat],
                        destinationCoords
                    ]
                }
            }
        });
        
        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#276EF1',
                'line-width': 4
            }
        });
        
        routeLine = true;
    }
    
    // Fit map to show both markers
    const bounds = new mapboxgl.LngLatBounds()
        .extend([userCoords.lng, userCoords.lat])
        .extend(destinationCoords);
    
    map.fitBounds(bounds, {
        padding: 100,
        duration: 1000
    });
}

// Simulate driver approaching
function simulateDriverApproaching() {
    // In a real app, this would show real-time updates of the driver's location
    console.log('Driver is approaching pickup location');
    
    // Create driver location (slightly away from pickup)
    const userCoords = userMarker.getLngLat();
    const driverCoords = [
        userCoords.lng + 0.008,
        userCoords.lat - 0.005
    ];
    
    // Add driver marker
    if (driverMarker) {
        driverMarker.remove();
    }
    
    // Create a car element for the driver marker
    const el = document.createElement('div');
    el.className = 'driver-marker';
    el.innerHTML = '<i class="fas fa-car" style="color: #000; font-size: 20px;"></i>';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#fff';
    el.style.display = 'flex';
    el.style.justifyContent = 'center';
    el.style.alignItems = 'center';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    
    // Add pulse effect behind the driver marker
    const pulseEl = document.createElement('div');
    pulseEl.className = 'marker-pulse';
    el.appendChild(pulseEl);
    
    driverMarker = new mapboxgl.Marker(el)
        .setLngLat(driverCoords)
        .addTo(map);
        
    // Update driver ETA text with animation
    const etaElement = document.querySelector('.driver-eta h3');
    etaElement.classList.add('driver-approaching');
    
    // Simulate driver movement
    let progress = 0;
    const totalSteps = 60; // 60 steps for 3 minutes (3 seconds per step in this demo)
    
    const etaElement = document.querySelector('.driver-eta h3');
    let minutes = 3;
    let seconds = 0;
    
    // Fit map to show both markers
    const bounds = new mapboxgl.LngLatBounds()
        .extend([userCoords.lng, userCoords.lat])
        .extend(driverCoords);
    
    map.fitBounds(bounds, {
        padding: 100,
        duration: 1000
    });
    
    const driverInterval = setInterval(() => {
        progress++;
        seconds--;
        
        if (seconds < 0) {
            minutes--;
            seconds = 59;
        }
        
        // Update driver position
        if (progress <= totalSteps) {
            const newLng = driverCoords[0] - (progress * (driverCoords[0] - userCoords.lng) / totalSteps);
            const newLat = driverCoords[1] - (progress * (driverCoords[1] - userCoords.lat) / totalSteps);
            
            driverMarker.setLngLat([newLng, newLat]);
            
            // Rotate the car icon to face the direction of travel
            if (progress > 1) {
                const angle = Math.atan2(
                    newLat - driverMarker.getLngLat().lat,
                    newLng - driverMarker.getLngLat().lng
                ) * 180 / Math.PI;
                el.style.transform = `rotate(${90 + angle}deg)`;
            }
        }
        
        // Update ETA text
        if (minutes === 0 && seconds === 0) {
            clearInterval(driverInterval);
            etaElement.textContent = 'Your driver has arrived';
            
            // Start live tracking
            if (currentRouteData) {
                liveTracking = new LiveTracking(map, currentRouteData);
                liveTracking.start(currentRouteData);
            }
            
            // Show rating panel after a delay (simulating end of trip)
            setTimeout(() => {
                if (liveTracking) {
                    liveTracking.stop();
                }
                driverPanel.classList.add('hidden');
                ratingPanel.classList.remove('hidden');
                document.getElementById('ratingDriverName').textContent = currentTrip.driver;
            }, 15000);
        } else {
            const minuteText = minutes === 1 ? 'min' : 'mins';
            if (minutes > 0) {
                etaElement.textContent = `Your driver is arriving in ${minutes}:${seconds.toString().padStart(2, '0')} ${minuteText}`;
            } else {
                etaElement.textContent = `Your driver is arriving in ${seconds} seconds`;
            }
        }
    }, 50); // Speed up for demo (50ms instead of 1000ms)
}

// Show trip history
function showTripHistory() {
    tripHistoryPanel.classList.remove('hidden');
    const tripHistoryList = document.getElementById('tripHistoryList');
    tripHistoryList.innerHTML = '';
    
    if (tripHistory.length === 0) {
        tripHistoryList.innerHTML = `
            <div class="no-results">
                You haven't taken any trips yet.
            </div>
        `;
        return;
    }
    
    tripHistory.forEach(trip => {
        const tripDate = formatDate(trip.date);
        const tripElement = document.createElement('div');
        tripElement.className = 'trip-item';
        tripElement.innerHTML = `
            <div class="trip-header">
                <div class="trip-date">${tripDate}</div>
                <div class="trip-price">$${trip.price.toFixed(2)}</div>
            </div>
            <div class="trip-route">
                <div class="trip-from">${trip.pickup}</div>
                <div class="trip-to">${trip.destination}</div>
            </div>
            <div class="trip-footer">
                <div class="trip-car">${trip.car}</div>
                <div class="trip-rating">
                    ${generateRatingStars(trip.rating)}
                </div>
            </div>
        `;
        
        tripHistoryList.appendChild(tripElement);
    });
}

// Show payment methods
function showPaymentMethods() {
    paymentMethodsPanel.classList.remove('hidden');
    const paymentMethodsList = document.getElementById('paymentMethods');
    paymentMethodsList.innerHTML = '';
    
    // Sample payment methods
    const paymentMethods = [
        { id: 'card-1', name: 'Personal Card', info: '•••• 4242', icon: 'fa-credit-card', selected: true },
        { id: 'card-2', name: 'Business Card', info: '•••• 5678', icon: 'fa-credit-card', selected: false },
        { id: 'paypal', name: 'PayPal', info: 'john.doe@example.com', icon: 'fa-paypal', selected: false },
        { id: 'apple-pay', name: 'Apple Pay', info: 'iPhone', icon: 'fa-apple-pay', selected: false }
    ];
    
    paymentMethods.forEach(method => {
        const methodElement = document.createElement('div');
        methodElement.className = `payment-method ${method.selected ? 'selected' : ''}`;
        methodElement.innerHTML = `
            <div class="payment-icon">
                <i class="fab ${method.icon}"></i>
            </div>
            <div class="payment-details">
                <div class="payment-name">${method.name}</div>
                <div class="payment-info">${method.info}</div>
            </div>
        `;
        
        methodElement.addEventListener('click', () => {
            // Update selected payment method
            document.querySelectorAll('.payment-method').forEach(el => {
                el.classList.remove('selected');
            });
            methodElement.classList.add('selected');
            
            // Update displayed payment method
            selectedPaymentMethod.textContent = `${method.name} ${method.info}`;
            
            // Close panel after selection
            setTimeout(() => {
                paymentMethodsPanel.classList.add('hidden');
            }, 300);
        });
        
        paymentMethodsList.appendChild(methodElement);
    });
}

// Apply promo code
function applyPromoCode(code) {
    // Sample promo codes
    const promoCodes = {
        'WELCOME10': { discount: '10% off', valid: true },
        'SUMMER20': { discount: '20% off', valid: true },
        'RIDE5': { discount: '$5 off', valid: true }
    };
    
    if (promoCodes[code] && promoCodes[code].valid) {
        showToast(`Promo code ${code} applied!`);
        
        // Add promo to the list
        const promoElement = document.createElement('div');
        promoElement.className = 'applied-promo';
        promoElement.innerHTML = `
            <div class="promo-info">
                <i class="fas fa-tag"></i>
                <span>${code} - ${promoCodes[code].discount}</span>
            </div>
            <button class="remove-promo">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add remove functionality
        promoElement.querySelector('.remove-promo').addEventListener('click', () => {
            promoElement.remove();
            showToast('Promo code removed');
        });
        
        if (promoContainer) {
            promoContainer.appendChild(promoElement);
        }
    } else {
        showToast('Invalid promo code');
    }
}

// Update rating stars
function updateRatingStars() {
    ratingStars.forEach((star, i) => {
        if (i < currentRating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Generate rating stars HTML
function generateRatingStars(rating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHtml += '<i class="fas fa-star active"></i>';
        } else {
            starsHtml += '<i class="fas fa-star"></i>';
        }
    }
    return starsHtml;
}

// Format date
function formatDate(date) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Get selected ride price
function getSelectedRidePrice() {
    const selectedRide = document.querySelector('.ride-type.selected');
    if (selectedRide) {
        const priceText = selectedRide.querySelector('.ride-price').textContent;
        return parseFloat(priceText.replace('$', ''));
    }
    return 15.49; // Default price
}

// Get selected ride type
function getSelectedRideType() {
    const selectedRide = document.querySelector('.ride-type.selected');
    if (selectedRide) {
        return selectedRide.querySelector('h4').textContent;
    }
    return 'UberX'; // Default ride type
}

// Generate trip ID
function generateTripId() {
    return 'trip-' + Math.random().toString(36).substr(2, 9);
}

// Show toast message
function showToast(message) {
    // Create toast if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize the app
function initApp() {
    map = initMap();
    setupEventListeners();
    
    // Initialize payment method display
    if (selectedPaymentMethod) {
        selectedPaymentMethod.textContent = "Personal Card •••• 4242";
    }
    
    // Add animation classes to elements
    document.querySelectorAll('.ride-type').forEach(el => {
        el.classList.add('fade-in');
    });
    
    document.querySelector('.request-ride-btn').classList.add('slide-up');
    
    // Add pulse animation to the pickup dot
    const pickupDot = document.querySelector('.input-icon.pickup .dot');
    if (pickupDot) {
        pickupDot.classList.add('pulse');
    }
    
    // Initialize enhanced UI elements
    window.initEnhancedUI();
}

// Start the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);