import fs from 'fs';
async function run() {
  const url = 'https://smartsolar-th.com/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  fs.writeFileSync('openapi-full.json', JSON.stringify(json, null, 2));
}
run();
