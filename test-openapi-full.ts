async function run() {
  const url = 'https://smartsolar-th.com/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  const def = json.paths['/api/v1/solar-street-lights/bulk-brightness/{multicastGroupId}'];
  if (def) {
      console.log("Parameters for bulk-brightness:", JSON.stringify(def.post.parameters, null, 2));
      console.log("Body for bulk-brightness:", JSON.stringify(def.post.requestBody, null, 2));
  }
}
run();
