async function run() {
  const url = 'https://smartsolar-th.com/api/v1/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  const path = json.paths['/solar-street-lights/{dev_eui}/brightness'];
  if (path) {
    console.log(JSON.stringify(path.post.requestBody, null, 2));
  } else {
    console.log("Path not found");
  }
}
run();
