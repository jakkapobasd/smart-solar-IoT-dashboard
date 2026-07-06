async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/proxy/devices/0e0b894ac6e1fa28/events?limit=10", { headers: {"Authorization": "Bearer mock-jwt-token-abcd-1234"} });
    console.log(res.status, await res.text());
  } catch(e) {}
}
test();
