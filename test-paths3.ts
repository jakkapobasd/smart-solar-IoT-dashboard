async function checkPaths() {
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const paths = [
    `/api/v1/energy/${fakeId}/energy-summary`,
    `/api/v1/energy/energy-summary`,
    `/api/v1/solar-street-lights/${fakeId}/energy-summary`
  ];
  
  for(let path of paths) {
     const url = `https://smartsolar-th.com${path}`;
     const res = await fetch(url);
     console.log(path, res.status);
  }
}
checkPaths();
