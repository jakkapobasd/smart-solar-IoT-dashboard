const fetch = require('node-fetch');

async function checkPaths() {
  const paths = [
    '/energy-summary',
    '/solar-street-lights/energy-summary',
    '/energy/energy-summary',
    '/street-light/energy-summary',
    '/api/v1/energy-summary',
    '/api/v1/solar-street-lights/energy-summary',
    '/api/v1/energy/energy-summary'
  ];
  
  for(let path of paths) {
     const url = `https://smartsolar-th.com${path.startsWith('/') ? path : '/api/v1/' + path}`;
     const res = await fetch(url);
     console.log(path, res.status);
  }
}
checkPaths();
