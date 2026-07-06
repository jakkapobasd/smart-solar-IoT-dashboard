async function run() {
  const url = 'https://smartsolar-th.com/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  const fs = require('fs');
  fs.writeFileSync('openapi-full.json', JSON.stringify(json, null, 2));
}
run();
