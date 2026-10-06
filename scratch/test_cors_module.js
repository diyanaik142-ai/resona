import cors from 'cors';
const req = { headers: { origin: 'https://localhost' }, method: 'OPTIONS' };
const res = { 
  setHeader: (k, v) => console.log('Set ' + k + ': ' + v),
  getHeader: () => null,
  statusCode: 200,
  end: () => console.log('res.end() called')
};
cors({ 
  origin: ['https://localhost'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})(req, res, () => console.log('next called'));
