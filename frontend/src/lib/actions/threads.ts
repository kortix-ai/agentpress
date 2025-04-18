'use server'

export const generateThreadName = async (message: string): Promise<string> => {
  // Default name in case the API fails or message is short
  const defaultName = message.trim().length > 50 
    ? message.trim().substring(0, 47) + "..." 
    : message.trim();

  // Get backend API URL from environment variables, default to localhost:8000
  const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${backendApiUrl}/api/threads/generate-name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }), // Send message in the request body
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend API error:', response.status, errorData);
      return defaultName; // Fallback on error
    }

    const data = await response.json();
    const generatedName = data?.name?.trim();

    // Return the generated name or default if empty/missing
    return generatedName || defaultName;

  } catch (error) {
    console.error('Error calling backend to generate thread name:', error);
    // Fallback on any exception during the fetch or processing
    return defaultName;
  }
}; 