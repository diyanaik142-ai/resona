fetch('https://resona.anchorlyhms.com/api/platform/config', { 
  method: 'GET', 
  headers: { 
    'Origin': 'https://localhost'
  } 
}).then(res => { 
  console.log(res.status); 
  res.headers.forEach((v, k) => console.log(k + ': ' + v)); 
}).catch(console.error);
