// Default runtime config (dev). In the Docker image this file is rewritten
// at container start from the API_URL env var. Empty here → the app falls
// back to VITE_API_URL, then localhost.
window.__FIREPLACE__ = {};
