import fetch from "node-fetch";

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/proxy/devices/0e0b894ac6e1fa28/events", {
       headers: { "Authorization": "Bearer mock-jwt-token-abcd-1234" }
    });
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
