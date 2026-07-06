async function run() {
  const url = 'https://smartsolar-th.com/api/v1/solar-street-lights/bulk-brightness/00000000-0000-0000-0000-000000000000';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brightnessLevel: 100, duration: 600 })
  });
  console.log(url, res.status);
  
  const url2 = 'https://smartsolar-th.com/api/v1/solar-street-lights/bulk-brightness?deviceEui=00000000-0000-0000-0000-000000000000';
  const res2 = await fetch(url2, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brightnessLevel: 100, duration: 600 })
  });
  console.log(url2, res2.status);
  
  const url3 = 'https://smartsolar-th.com/api/v1/solar-street-lights/bulk-brightness';
  const res3 = await fetch(url3, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ devEuis: ["0000000000000000"], brightnessLevel: 100, duration: 600 })
  });
  console.log(url3, "body array", res3.status);
}
run();
