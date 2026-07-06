async function run() {
  const url = 'https://smartsolar-th.com/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  const paths = Object.keys(json.paths).filter(p => p.includes('brightness'));
  for (const p of paths) {
    console.log(p);
    console.log(JSON.stringify(json.paths[p].post?.requestBody || json.paths[p].put?.requestBody || {}, null, 2));
  }
}
run();
