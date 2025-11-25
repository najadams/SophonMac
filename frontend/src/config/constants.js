 // Use the appropriate API URL based on environment and role
export const getBackendURL = () => {
  // Check if we're in a web deployment (no Electron)
  const isWebDeployment = !window.require && !window.process?.versions?.electron;
  
  if (isWebDeployment) {
    // In web deployment, use environment variable or default production URL
    return import.meta.env.VITE_API_URL || 'http://localhost:80';
  }
  
  // In Electron app, use localhost
  // Backend runs on port 80
  const hostname = window.location.hostname;
  
  // If accessing via localhost, this is the master device
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:80';
  }
  
  // If accessing via network IP, this is a slave device
  // Use the network IP to connect to the master server
  return `http://${hostname}:80`;
};

export const API_BASE_URL = getBackendURL();
