const Minio = require('minio');
const duckdb = require('duckdb'); // npm install express dotenv minio duckdb
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');  // npm install uuid
require('dotenv').config();
const { ApiResponse, ApiErrorResponse } = require("../utils/global");


const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});


const db = new duckdb.Database(':memory:');


async function maxFileLimit(directory, maxFiles) {
  
  console.log('Checkig max File Limit')

  const files = await fs.promises.readdir(directory);

  const parquetFiles = await Promise.all(
    files
      .filter(f => f.endsWith('.parquet'))
      .map(async (file) => {
        const fullPath = path.join(directory, file);
        const stats = await fs.promises.stat(fullPath);
        return { file, fullPath, ctime: stats.ctime };
      })
  );

  parquetFiles.sort((a, b) => a.ctime - b.ctime);

  // Delete oldest if over limit
  while (parquetFiles.length > maxFiles) {
    const oldest = parquetFiles.shift();
    try {
      await fs.promises.unlink(oldest.fullPath);
      console.log('Deleted old parquet file:', oldest.fullPath);
    } catch (err) {
      console.error('Error deleting file during limit enforcement:', err);
    }
  }
}


async function downloadParquetFile(bucketName, objectName, destFilePath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destFilePath);
    minioClient.getObject(bucketName, objectName, (err, dataStream) => {
      if (err) {
        reject(err);
        return;
      }
      dataStream.pipe(fileStream);

      fileStream.on('close', () => {
        resolve(destFilePath);
      });

      fileStream.on('error', (err) => {
        reject(err);
      });
    });
  });
}



// Function to convert BigInt to String in an object
function handleBigIntValues(obj) {
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (typeof obj[key] === 'bigint') {
        obj[key] = obj[key].toString();  
      } else if (typeof obj[key] === 'object') {
        handleBigIntValues(obj[key]); 
      }
    }
  }
}




const cache = {};
const CACHE_EXPIRATION_TIME = 2 * 60 * 1000; // 2 minutes

// Periodic cleanup function to delete expired files
setInterval(() => {
  const now = Date.now();
  for (const [cacheKey, { filePath, timestamp }] of Object.entries(cache)) {
    if (now - timestamp > CACHE_EXPIRATION_TIME) {
      fs.promises.unlink(filePath)
        .then(() => {
          console.log('Deleted expired file:', filePath);
          delete cache[cacheKey]; 
        })
        .catch((err) => console.error('Error deleting file:', err));
    }
  }
}, 120 * 1000); // Run cleanup every 2 minute

async function getOrDownloadParquetFile(bucketName, objectName) {
  const cacheKey = `${bucketName}/${objectName}`;

  const parentDir = path.join(__dirname, '..');
  const downloadDir = path.join(parentDir, 'downloaded_files');

  if (cache[cacheKey]) {
    const { filePath, timestamp } = cache[cacheKey];
    const now = Date.now();


    if (now - timestamp < CACHE_EXPIRATION_TIME) {
      try {

        await fs.promises.access(filePath, fs.constants.F_OK);
        console.log('Returning cached Parquet file:', filePath);
        return filePath;
      } catch (err) {
        console.log('Cached file not found on disk (was deleted or missing), re-downloading:', filePath);

        await fs.promises.mkdir(downloadDir, { recursive: true }); //ensuring folder exists

        const tempFilePath = path.join(downloadDir, `temp-${uuidv4()}.parquet`);
        await downloadParquetFile(bucketName, objectName, tempFilePath);
        await maxFileLimit(downloadDir, 5)

        cache[cacheKey] = {
          filePath: tempFilePath,
          timestamp: Date.now(),
        };

        console.log('File re-downloaded and cached:', tempFilePath);
        return tempFilePath;
      }
    }

    try {
      await fs.promises.unlink(filePath);
      console.log('Cache expired or file missing. Deleted old file:', filePath);
    } catch (err) {
      console.error('Error deleting expired or missing file:', err);
    }
  }
  const tempFilePath = path.join(downloadDir, `temp-${uuidv4()}.parquet`);
  await downloadParquetFile(bucketName, objectName, tempFilePath);
  await maxFileLimit(downloadDir, 5)

  cache[cacheKey] = {
    filePath: tempFilePath,
    timestamp: Date.now(),
  };

  console.log('Parquet file downloaded and cached:', tempFilePath);
  return tempFilePath;
}






// /updated - Function to extract barcode details
function extractBarcodeDetails(barcode) {
  const lastFourDigits = barcode.slice(-4); // Extract the last four digits
  const objectName = `warehouse/dwh_sales.db/fact_cus_prod_dtl_reg_v3/data/last4_digits=${lastFourDigits}/`;
  console.log('ObjectName: ', objectName)
  
  return {
    barcode,
    bucketName: process.env.MINIO_BUCKET_NAME,
    objectName,
  };
}


// /updated - Function to get barcode details from S3
async function getBarcodeDetailsFromMinio(bucketName, prefix, barcode) {
  return new Promise((resolve, reject) => {
    const stream = minioClient.listObjectsV2(bucketName, prefix, true);
    const parquetFiles = [];

    stream.on('data', obj => {
      if (obj.name.endsWith('.parquet')) {
        parquetFiles.push(obj.name);
      }
    });

    stream.on('end', async () => {
      if (parquetFiles.length === 0) {
        return reject(new Error('No .parquet files found.'));
      }

      for (const fileName of parquetFiles) {
        try {
          const tempFilePath = await getOrDownloadParquetFile(bucketName, fileName);
          const query = `
            SELECT * FROM read_parquet('${tempFilePath}') 
            WHERE serial_number = '${barcode}'
          `;

          const result = await new Promise((res, rej) =>
            db.all(query, (err, rows) => {
              if (err) rej(err);
              else res(rows);
            })
          );

          result.forEach(handleBigIntValues);

          if (result.length > 0) {
            console.log(`Found barcode in file: ${fileName}`);
            return resolve(result);
          } else {
            console.log(`Barcode not found in file: ${fileName}`);
          }
        } catch (err) {
          console.error(`Error processing file ${fileName}:`, err);
        }
      }

      // If no match found in any file
      return resolve([]);
    });

    stream.on('error', err => {
      reject(err);
    });
  });
}

// /updated - Route handler for fetching barcode detail
exports.getBarcodeDetails = async (req, res) => {
  try {
    console.log('Api Running..')

    const {data} = req.body;
    const barcode = data?.barcode;
    if (!barcode) {
      return ApiErrorResponse(res, 'BAD_REQUEST', 'Barcode is required.');
    }

    const { bucketName, objectName } = extractBarcodeDetails(barcode);

    const result = await getBarcodeDetailsFromMinio(bucketName, objectName, barcode);

    console.log('Barcode details fetched successfully:');
    return ApiResponse(res, 'SUCCESS', result);
  } catch (err) {
    console.error('Error fetching barcode details:', err);
    throw err;

  }
};
