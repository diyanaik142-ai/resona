import cors from 'cors';
const baseAppOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost,https://resona.anchorlyhms.com').split(',').map((value) => value.trim());
const allowedOrigins = [...new Set([...baseAppOrigins, 'capacitor://localhost', 'https://localhost'])];

const req = { headers: { origin: 'https://localhost' }, method: 'OPTIONS' };
const res = { 
  setHeader: (k, v) => console.log('Set ' + k + ': ' + v),
  getHeader: () => null,
  statusCode: 200,
  end: () => console.log('res.end() called')
};
cors({ 
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})(req, res, () => console.log('next called'));
