document.addEventListener('DOMContentLoaded', function() {
    const weatherWidget = document.getElementById('weatherWidget');
    const weatherCity = document.getElementById('weatherCity');
    const weatherForm = document.getElementById('weatherForm');
    const weatherDisplay = document.getElementById('weatherDisplay');
    
    weatherForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const city = weatherCity.value.trim();
        if (city) {
            fetchWeather(city);
        }
    });
    
    async function fetchWeather(city) {
        try {
            weatherDisplay.innerHTML = '<p>Loading weather data...</p>';
            
            // Using OpenWeatherMap API with a free tier (you would need to replace with your own API key in production)
            const apiKey = 'demo'; // Using demo mode for example purposes
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
            
            if (!response.ok) {
                throw new Error('City not found or API limit reached');
            }
            
            const data = await response.json();
            displayWeather(data);
        } catch (error) {
            weatherDisplay.innerHTML = `<p class="weather-error">Error: ${error.message}</p>`;
        }
    }
    
    function displayWeather(data) {
        // For demo purposes, we'll show a simplified version since the API key is demo
        weatherDisplay.innerHTML = `
            <div class="weather-info">
                <h3>${data.name}, ${data.sys.country}</h3>
                <div class="weather-main">
                    <span class="temperature">${Math.round(data.main.temp)}°C</span>
                    <span class="description">${data.weather[0].description}</span>
                </div>
                <div class="weather-details">
                    <p>Feels like: ${Math.round(data.main.feels_like)}°C</p>
                    <p>Humidity: ${data.main.humidity}%</p>
                    <p>Wind: ${data.wind.speed} m/s</p>
                </div>
            </div>
        `;
    }
    
    // Initialize with a default city
    fetchWeather('London');
});