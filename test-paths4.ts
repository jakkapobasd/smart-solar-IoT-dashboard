async function checkPaths() {
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const paths = [
    `/api/v1/solar-street-lights/brightness/${fakeId}`,
    `/api/v1/solar-street-lights/bulk-brightness/${fakeId}`,
    `/api/v1/devices/${fakeId}/queue`
  ];
  
  for(let path of paths) {
     const url = `https://smartsolar-th.com${path}`;
     const res = await fetch(url, { method: 'POST', body: '{}', headers: {'Content-Type': 'application/json'}});
     console.log(path, res.status);
  }
}
checkPaths();
