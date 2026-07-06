import fs from 'fs';
async function run() {
  const url = 'https://smartsolar-th.com/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  const bulkPaths = Object.keys(json.paths).filter(p => p.includes('bulk-brightness'));
  for (const p of bulkPaths) {
      console.log(p, JSON.stringify(json.paths[p], null, 2));
  }
}
run();
