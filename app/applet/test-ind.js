async function run() {
  const payloads = [
    { brightnessLevel: 100, duration: 600 },
    { brightness: 100, duration: 600 },
    { level: 100, duration: 600 },
    { value: 100, duration: 600 }
  ];
  const url = 'https://smartsolar-th.com/api/v1/solar-street-lights/0e0b894ac6e1fa28/brightness';
  for (const p of payloads) {
     const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
     });
     console.log(JSON.stringify(p), res.status, await res.text());
  }
}
run();
