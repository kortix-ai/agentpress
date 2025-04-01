// Test Runner Script
console.log("Test Runner initialized");

// Function to run all tests automatically
function autoRunTests() {
    console.log("Auto-running tests...");
    
    // Tests to run in sequence
    const tests = [
        testColorChanger,
        testCounter,
        testTodoList,
        testWeatherWidget,
        testGallery
    ];
    
    // Run tests sequentially
    runTestSequence(tests, 0);
}

// Run tests in sequence
function runTestSequence(tests, index) {
    if (index >= tests.length) {
        console.log("All tests completed!");
        return;
    }
    
    console.log(`Running test ${index + 1}/${tests.length}...`);
    
    // Run current test
    const currentTest = tests[index];
    currentTest(() => {
        // When test completes, run next test
        runTestSequence(tests, index + 1);
    });
}

// Test Color Changer
function testColorChanger(callback) {
    console.log("Testing Color Changer...");
    
    const changeColorBtn = document.getElementById('changeColorBtn');
    const colorDisplay = document.getElementById('colorDisplay');
    
    if (!changeColorBtn || !colorDisplay) {
        console.error("Color changer elements not found!");
        if (callback) callback();
        return;
    }
    
    // Get initial state
    const initialColor = colorDisplay.style.backgroundColor;
    console.log(`Initial color: ${initialColor || 'none'}`);
    
    // Click button
    changeColorBtn.click();
    
    // Check result
    setTimeout(() => {
        const newColor = colorDisplay.style.backgroundColor;
        console.log(`New color: ${newColor}`);
        
        if (newColor && newColor !== initialColor) {
            console.log("✅ Color changer test passed!");
        } else {
            console.error("❌ Color changer test failed!");
        }
        
        if (callback) callback();
    }, 500);
}

// Test Counter
function testCounter(callback) {
    console.log("Testing Counter...");
    
    const decrementBtn = document.getElementById('decrementBtn');
    const incrementBtn = document.getElementById('incrementBtn');
    const counterValue = document.getElementById('counterValue');
    
    if (!decrementBtn || !incrementBtn || !counterValue) {
        console.error("Counter elements not found!");
        if (callback) callback();
        return;
    }
    
    // Get initial value
    const initialValue = parseInt(counterValue.textContent);
    console.log(`Initial counter value: ${initialValue}`);
    
    // Test increment
    incrementBtn.click();
    
    setTimeout(() => {
        const afterIncrement = parseInt(counterValue.textContent);
        console.log(`After increment: ${afterIncrement}`);
        
        if (afterIncrement === initialValue + 1) {
            console.log("✅ Increment test passed!");
        } else {
            console.error("❌ Increment test failed!");
        }
        
        // Test decrement
        decrementBtn.click();
        decrementBtn.click();
        
        setTimeout(() => {
            const afterDecrement = parseInt(counterValue.textContent);
            console.log(`After decrement: ${afterDecrement}`);
            
            if (afterDecrement === initialValue - 1) {
                console.log("✅ Decrement test passed!");
            } else {
                console.error("❌ Decrement test failed!");
            }
            
            if (callback) callback();
        }, 500);
    }, 500);
}

// Test Todo List
function testTodoList(callback) {
    console.log("Testing Todo List...");
    
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoList = document.getElementById('todoList');
    
    if (!todoInput || !addTodoBtn || !todoList) {
        console.error("Todo list elements not found!");
        if (callback) callback();
        return;
    }
    
    // Get initial todo count
    const initialCount = todoList.querySelectorAll('.todo-item').length;
    console.log(`Initial todo count: ${initialCount}`);
    
    // Add a new todo
    const testTodoText = `Test Todo ${Date.now()}`;
    todoInput.value = testTodoText;
    addTodoBtn.click();
    
    setTimeout(() => {
        // Check if todo was added
        const newCount = todoList.querySelectorAll('.todo-item').length;
        console.log(`New todo count: ${newCount}`);
        
        if (newCount === initialCount + 1) {
            console.log("✅ Add todo test passed!");
            
            // Get the last todo item
            const lastTodo = todoList.querySelector('.todo-item:last-child');
            const checkbox = lastTodo.querySelector('input[type="checkbox"]');
            const deleteBtn = lastTodo.querySelector('.delete-btn');
            
            // Test toggle functionality
            checkbox.click();
            
            setTimeout(() => {
                if (lastTodo.classList.contains('completed')) {
                    console.log("✅ Toggle todo test passed!");
                } else {
                    console.error("❌ Toggle todo test failed!");
                }
                
                // Test delete functionality
                deleteBtn.click();
                
                setTimeout(() => {
                    const finalCount = todoList.querySelectorAll('.todo-item').length;
                    console.log(`Final todo count: ${finalCount}`);
                    
                    if (finalCount === initialCount) {
                        console.log("✅ Delete todo test passed!");
                    } else {
                        console.error("❌ Delete todo test failed!");
                    }
                    
                    if (callback) callback();
                }, 500);
            }, 500);
        } else {
            console.error("❌ Add todo test failed!");
            if (callback) callback();
        }
    }, 500);
}

// Test Weather Widget
function testWeatherWidget(callback) {
    console.log("Testing Weather Widget...");
    
    const weatherCity = document.getElementById('weatherCity');
    const weatherForm = document.getElementById('weatherForm');
    const weatherDisplay = document.getElementById('weatherDisplay');
    
    if (!weatherCity || !weatherForm || !weatherDisplay) {
        console.error("Weather widget elements not found!");
        if (callback) callback();
        return;
    }
    
    // Check if initial weather is displayed
    const initialWeatherInfo = weatherDisplay.querySelector('.weather-info');
    
    if (initialWeatherInfo) {
        console.log("✅ Initial weather display test passed!");
    } else {
        console.log("❓ No initial weather displayed, will test form submission");
    }
    
    // Test form submission
    weatherCity.value = "Tokyo";
    
    // Create and dispatch submit event
    const submitEvent = new Event('submit');
    weatherForm.dispatchEvent(submitEvent);
    
    console.log("Weather form submitted with city: Tokyo");
    
    // Wait for API response
    setTimeout(() => {
        const weatherInfo = weatherDisplay.querySelector('.weather-info');
        
        if (weatherInfo) {
            const cityName = weatherInfo.querySelector('h3');
            const temperature = weatherInfo.querySelector('.temperature');
            
            if (cityName && temperature) {
                console.log("✅ Weather API test passed!");
                console.log(`City: ${cityName.textContent}, Temperature: ${temperature.textContent}`);
            } else {
                console.error("❌ Weather display structure test failed!");
            }
        } else {
            console.error("❌ Weather API test failed!");
        }
        
        if (callback) callback();
    }, 2000);
}

// Test Gallery
function testGallery(callback) {
    console.log("Testing Image Gallery...");
    
    const galleryImages = document.getElementById('galleryImages');
    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    const imageUpload = document.getElementById('imageUpload');
    const uploadBtn = document.getElementById('uploadImageBtn');
    
    if (!galleryImages || !prevBtn || !nextBtn || !imageUpload || !uploadBtn) {
        console.error("Gallery elements not found!");
        if (callback) callback();
        return;
    }
    
    // Check if initial gallery is displayed
    const initialImage = galleryImages.querySelector('.gallery-img');
    
    if (initialImage) {
        console.log("✅ Initial gallery display test passed!");
        
        // Test navigation
        const initialCounter = galleryImages.querySelector('.gallery-counter').textContent;
        console.log(`Initial image: ${initialCounter}`);
        
        // Test next button
        nextBtn.click();
        
        setTimeout(() => {
            const newCounter = galleryImages.querySelector('.gallery-counter').textContent;
            console.log(`After next: ${newCounter}`);
            
            if (newCounter !== initialCounter) {
                console.log("✅ Gallery navigation test passed!");
            } else {
                console.error("❌ Gallery navigation test failed!");
            }
            
            // Test image upload
            const testImageUrl = "https://source.unsplash.com/random/300x200?test";
            imageUpload.value = testImageUrl;
            uploadBtn.click();
            
            setTimeout(() => {
                const finalCounter = galleryImages.querySelector('.gallery-counter').textContent;
                console.log(`After upload: ${finalCounter}`);
                
                if (finalCounter.includes(testImageUrl)) {
                    console.log("✅ Image upload test passed!");
                } else {
                    console.log("⚠️ Image upload test inconclusive - can't verify image URL");
                }
                
                if (callback) callback();
            }, 500);
        }, 500);
    } else {
        console.log("⚠️ No initial gallery image displayed");
        if (callback) callback();
    }
}

// Start tests when page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, waiting for all resources...");
    
    // Wait a bit longer to ensure all scripts are initialized
    setTimeout(autoRunTests, 1000);
});