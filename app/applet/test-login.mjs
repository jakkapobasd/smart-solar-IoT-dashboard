import fetch from "node-fetch";

async function run() {
  try {
    const loginRes = await fetch("http://43.228.84.18:8080/api/internal/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin", password: "password" }),
      headers: { "Content-Type": "application/json" }
    });
    const loginData = await loginRes.json();
    console.log("Login:", loginData);
    if (!loginData.jwt) return;
    
    const jwt = loginData.jwt;
    const devEui = "0e0b894ac6e1fa28";
    
    // try metrics
    const start = new Date(Date.now() - 3600000).toISOString();
    const end = new Date().toISOString();
    const metricsRes = await fetch(`http://43.228.84.18:8080/api/devices/${devEui}/metrics?start=${start}&end=${end}&aggregation=MINUTE`, {
      headers: { "Authorization": `Bearer ${jwt}` }
    });
    console.log("Metrics:", metricsRes.status, await metricsRes.text());
    
  } catch (e) {
    console.error(e);
  }
}
run();
