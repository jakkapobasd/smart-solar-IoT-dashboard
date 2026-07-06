async function run() {
  const res = await fetch('https://smartsolar-th.com/api/v1/swagger.json');
  console.log(await res.text());
}
run();
