async function run() {
  const url = 'https://smartsolar-th.com/docs';
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/url: "(.*?)"/);
  if (match) console.log("OpenAPI:", match[1]);
  else {
      const match2 = text.match(/["'](.*openapi.*\.json)["']/);
      console.log("fallback:", match2 ? match2[1] : text.slice(0, 500));
  }
}
run();
