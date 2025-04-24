// App/project/src/api.js
const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://lawpal.up.railway.app';

export const submitForm = async (formData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/submit-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error submitting form:', error);
    throw error;
  }
};

export const sendChatQuery = async (service, query, userId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/${service}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
      },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error sending chat query:', error);
    throw error;
  }
};

export const getChatHistory = async (service, userId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/${service}/history`, {
      method: 'GET',
      headers: { 'X-User-ID': userId },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};
