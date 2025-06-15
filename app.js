const express = require('express');
const dotenv = require('dotenv');
const parquetRoutes = require('./routes/parquetRoutes');
const errorHandler = require("./middleware/errorHandler");

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON request body
app.use(express.json());

// Use the parquet routes
app.use('/api', parquetRoutes);


// Centralized error handler - MUST be last middleware
app.use(errorHandler);
// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
