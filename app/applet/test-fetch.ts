async function getHeaders() {
  try {
    const res = await fetch('https://smartsolar-th.com');
    for (const [key, value] of res.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
  } catch (e) {
    console.log(e.message);
  }
}
getHeaders();
