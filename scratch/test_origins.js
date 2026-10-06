const baseAppOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost,https://resona.anchorlyhms.com').split(',').map((value) => value.trim());
const allowedOrigins = [...new Set([...baseAppOrigins, 'capacitor://localhost', 'https://localhost'])];
console.log(allowedOrigins);
