async function checkPaths() {
  const paths = [
    '/api/v1/energy-summary',
    '/api/v1/solar-street-lights/energy-summary',
    '/api/v1/gateways',
    '/api/v1/devices',
    '/api/v1/multicast-groups'
  ];
  
  for(let path of paths) {
     const url = `https://smartsolar-th.com${path}`;
     const res = await fetch(url);
     console.log(path, res.status);
  }
}
checkPaths();
