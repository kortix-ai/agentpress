// Mapbox Directions API helper
class MapboxDirections {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://api.mapbox.com/directions/v5/mapbox/driving';
  }

  async getRoute(start, end) {
    try {
      // In a real app, we would make an actual API call
      // For this demo, we'll simulate a response
      console.log(`Getting directions from ${start} to ${end}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a simulated route with waypoints
      const startCoords = Array.isArray(start) ? start : [start.lng, start.lat];
      const endCoords = Array.isArray(end) ? end : [end.lng, end.lat];
      
      // Generate some intermediate points for a more realistic route
      const numPoints = 8;
      const points = [];
      
      for (let i = 0; i <= numPoints; i++) {
        const ratio = i / numPoints;
        
        // Add some randomness to make the route look more natural
        const jitterLng = (Math.random() - 0.5) * 0.005;
        const jitterLat = (Math.random() - 0.5) * 0.005;
        
        points.push([
          startCoords[0] + (endCoords[0] - startCoords[0]) * ratio + jitterLng,
          startCoords[1] + (endCoords[1] - startCoords[1]) * ratio + jitterLat
        ]);
      }
      
      // Make sure the first and last points are exactly the start and end
      points[0] = startCoords;
      points[points.length - 1] = endCoords;
      
      return {
        routes: [{
          geometry: {
            coordinates: points,
            type: 'LineString'
          },
          distance: this.calculateDistance(startCoords, endCoords),
          duration: this.calculateDuration(startCoords, endCoords)
        }]
      };
    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  }
  
  // Calculate approximate distance in meters
  calculateDistance(start, end) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = start[1] * Math.PI/180;
    const φ2 = end[1] * Math.PI/180;
    const Δφ = (end[1] - start[1]) * Math.PI/180;
    const Δλ = (end[0] - start[0]) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in meters
  }
  
  // Calculate approximate duration in seconds
  calculateDuration(start, end) {
    const distance = this.calculateDistance(start, end);
    const averageSpeed = 35; // km/h
    
    // Convert to seconds: distance (m) / (speed (km/h) * 1000 / 3600)
    return distance / (averageSpeed * 1000 / 3600);
  }
}

// Export the class
window.MapboxDirections = MapboxDirections;