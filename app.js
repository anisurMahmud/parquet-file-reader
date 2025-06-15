const express = require('express');
const dotenv = require('dotenv');
const parquetRoutes = require('./routes/parquetRoutes');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON request body
app.use(express.json());

// Use the parquet routes
app.use('/api', parquetRoutes);

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
