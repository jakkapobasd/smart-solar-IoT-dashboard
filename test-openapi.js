const fetch = require('node-fetch');
async function run() {
  const urls = [
    'https://smartsolar-th.com/api/v1/swagger.json',
    'https://smartsolar-th.com/swagger/v1/swagger.json',
    'https://smartsolar-th.com/v3/api-docs'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(url, res.status);
    } catch (e) {
      console.log(url, e.message);
    }
  }
}
run();
