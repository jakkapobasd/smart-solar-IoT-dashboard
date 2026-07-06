const dns = require('dns').promises;
async function getIP() {
  try {
    const ip = await dns.resolve4('smartsolar-th.com');
    console.log(ip);
    const res = await fetch('http://ip-api.com/json/' + ip[0]);
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.log("Error:", e);
  }
}
getIP();
