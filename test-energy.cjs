async function run() {
  const urls = [
    'https://smartsolar-th.com/api/v1/energy-summary',
    'https://smartsolar-th.com/api/v1/energy/energy-summary',
    'https://smartsolar-th.com/api/v1/solar-street-lights/energy-summary',
    'https://smartsolar-th.com/api/v1/gateways',
  ];
  for (const u of urls) {
     const res = await fetch(u);
     console.log(u, res.status);
  }
}
run();
