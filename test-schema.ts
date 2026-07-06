async function run() {
  const url = 'https://smartsolar-th.com/openapi.json';
  const res = await fetch(url);
  const json = await res.json();
  console.log(JSON.stringify(json.components.schemas.BrightnessControlRequest, null, 2));
}
run();
