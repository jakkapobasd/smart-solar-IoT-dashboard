async function run() {
  const url = 'https://smartsolar-th.com/api/v1/energy/00000000-0000-0000-0000-000000000000/energy-summary?applicationId=00000000-0000-0000-0000-000000000000&startTs=2026-05-01T00:00:00Z&endTs=2026-05-31T23:59:59Z';
  const res = await fetch(url, { headers: { 'Authorization': 'Bearer test' } });
  console.log(res.status, await res.text());
}
run();
