const axios = require('axios');
async function run() {
  try {
    const res = await axios.get("http://localhost:3000/api/proxy/devices/0e0b894ac6e1fa28/events", {
       headers: { "Authorization": "Bearer mock-jwt-token-abcd-1234" },
       params: { limit: 5 }
    });
    console.log(res.data);
  } catch (e) {
    if (e.response) {
      console.error(e.response.status, e.response.data);
    } else {
      console.error(e.message);
    }
  }
}
run();
