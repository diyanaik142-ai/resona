fetch('http://localhost:8080/api/platform/config', { 
  method: 'OPTIONS', 
  headers: { 
    'Origin': 'https://localhost', 
    'Access-Control-Request-Method': 'GET' 
  } 
}).then(res => { 
  console.log(res.status); 
  res.headers.forEach((v, k) => console.log(k + ': ' + v)); 
}).catch(console.error);
