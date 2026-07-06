import fs from 'fs';
async function run() {
  const url = 'https://smartsolar-th.com/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  const pathDetail = json.paths['/api/v1/solar-street-lights/{dev_eui}/brightness'] || json.paths['/api/v1/solar-street-lights/{devEui}/brightness'] || json.paths['/solar-street-lights/{devEui}/brightness'];
  if (pathDetail) {
    console.log(JSON.stringify(pathDetail, null, 2));
  } else {
    // try any matching
    const matching = Object.keys(json.paths).filter(p => p.includes('brightness'));
    for (const p of matching) {
        console.log(p, JSON.stringify(json.paths[p], null, 2));
    }
  }
}
run();
