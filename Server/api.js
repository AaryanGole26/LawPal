const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || https://aryn26-lawpal.static.hf.space;

export const submitForm = async (formData) => {
  const response = await fetch(`${BACKEND_URL}/submit-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
};

export const sendChatQuery = async (service, query, userId) => {
  const response = await fetch(`${BACKEND_URL}/${service}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId,
    },
    body: JSON.stringify({ query }),
  });
  return response.json();
};

export const getChatHistory = async (service, userId) => {
  const response = await fetch(`${BACKEND_URL}/${service}/history`, {
    method: "GET",
    headers: { "X-User-ID": userId },
  });
  return response.json();
};