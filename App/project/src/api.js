import { supabase } from "./supabase";

const getApiBaseUrl = () => {
  const raw = (import.meta.env.VITE_API_URL || "").trim();
  if (!raw) {
    return "http://127.0.0.1:5050";
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
};

export const API_BASE_URL = getApiBaseUrl();

const GUEST_ID_KEY = "lawpal-guest-id";

// Keeps a guest's conversation across reloads within a browser tab.
const getGuestId = () => {
  try {
    let id = sessionStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const getAccessToken = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
};

/** Calls the backend with the user's identity and throws ApiError on any failure. */
export const apiFetch = async (path, { method = "GET", body } = {}) => {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = await getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers["X-Guest-ID"] = getGuestId();
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Unable to connect to the server. Please try again.", 0, "NETWORK_ERROR");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON error page, e.g. from a proxy in front of the backend.
  }
  if (!response.ok) {
    throw new ApiError(data?.error || `The server returned an error (${response.status}).`, response.status, data?.code);
  }
  if (data === null) {
    throw new ApiError("The server sent an unreadable response. Please try again.", response.status, "BAD_RESPONSE");
  }
  return data;
};
