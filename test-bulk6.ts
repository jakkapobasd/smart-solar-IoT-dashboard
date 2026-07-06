async function run() {
  const payloads = [
    { brightnessLevel: 100, duration: 600, deviceEuis: ["0000000000000000"] },
    { devEuis: ["0000000000000000"], brightnessLevel: 100, duration: 60 },
    { applicationId: "00000000-0000-0000-0000-000000000000", brightnessLevel: 100, duration: 600 },
    { multicastGroupId: "00000000-0000-0000-0000-000000000000", brightnessLevel: 100, duration: 600 },
    { groupId: "ac1036f5-0453-4dc9-9d51-8ecbcf082a17", brightnessLevel: 100, duration: 60 }
  ];
  const url = 'https://smartsolar-th.com/api/v1/solar-street-lights/bulk-brightness';
  for (const method of ['PUT', 'POST', 'PATCH']) {
    console.log(method);
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloads[0])
    });
    console.log(res.status, await res.text());
  }
}
run();
