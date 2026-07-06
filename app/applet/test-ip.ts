import dns from 'dns/promises';

async function getIP() {
  const ip = await dns.resolve4('smartsolar-th.com');
  console.log(ip);
  const res = await fetch('http://ip-api.com/json/' + ip[0]);
  const data = await res.json();
  console.log(data);
}
getIP();
