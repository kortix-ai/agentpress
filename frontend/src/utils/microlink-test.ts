import mql from '@microlink/mql';

/**
 * Example function to test microlink API
 * This demonstrates the exact usage pattern requested
 */
export async function testMicrolinkAPI() {
  console.log('🚀 BEFORE MICROLINK API CALL');
  console.log('Attempting to fetch data from: https://github.com/microlinkhq');

  try {
    // Fetch data using microlink API
    const { status, data } = await mql('https://github.com/microlinkhq');
    
    // Log the response details
    console.log('🎯 AFTER MICROLINK API CALL - SUCCESS');
    console.log('Status:', status);
    console.log('Data:', data);
    
    // Use the render function to display the data
    console.log('Rendering data with mql.render():');
    mql.render(data);
    
    return { status, data };
  } catch (error) {
    console.log('🛑 AFTER MICROLINK API CALL - ERROR');
    console.error('Error occurred:', error);
    throw error;
  }
}

// Example usage in browser console:
// import { testMicrolinkAPI } from '../utils/microlink-test';
// testMicrolinkAPI().then(result => console.log('Full result:', result)); 