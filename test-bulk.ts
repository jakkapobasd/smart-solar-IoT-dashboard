async function run() {
  const url = 'https://smartsolar-th.com/api/v1/solar-street-lights/bulk-brightness';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brightnessLevel: 100, duration: 60 })
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
