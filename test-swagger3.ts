async function run() {
  const res = await fetch('https://smartsolar-th.com/v3/api-docs');
  console.log((await res.text()).substring(0, 500));
}
run();
