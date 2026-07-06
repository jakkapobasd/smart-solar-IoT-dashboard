async function run() {
  const payloads = [
    { brightnessLevel: 100, duration: 600, deviceEuis: ["0000000000000000"] },
    { devEuis: ["0000000000000000"], brightnessLevel: 100, duration: 60 },
    { applicationId: "00000000-0000-0000-0000-000000000000", brightnessLevel: 100, duration: 600 },
    { multicastGroupId: "00000000-0000-0000-0000-000000000000", brightnessLevel: 100, duration: 600 }
  ];
  const url = 'https://smartsolar-th.com/api/v1/solar-street-lights/bulk-brightness';
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
