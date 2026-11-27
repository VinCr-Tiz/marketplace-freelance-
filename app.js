const app = require('./server/app');

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Freelance Marketplace API running on http://localhost:${port}`);
});
