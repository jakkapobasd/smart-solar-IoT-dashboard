import express from 'express';
const app = express();
app.use('/api/proxy', (req, res) => {
  console.log("req.originalUrl:", req.originalUrl);
  console.log("req.url:", req.url);
  console.log("req.path:", req.path);
  res.json({ original: req.originalUrl, url: req.url, path: req.path });
});
app.listen(3002, () => {
  fetch('http://localhost:3002/api/proxy/my-endpoint?test=1&hello=world')
    .then(r => r.json())
    .then(r => { console.log(r); process.exit(0); });
});
