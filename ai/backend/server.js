// server.js - Backend pentru sistemul de detectare a fețelor
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const sql = require('mssql');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configurare Express
const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Debugging endpoint to test CORS
app.options('*', cors());

// Configurare multer pentru stocarea temporară a fișierelor
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, 'temp');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Configurare conexiune Azure SQL
const sqlConfig = {
  user: process.env.SQL_USER || 'admin',
  password: process.env.SQL_PASSWORD || 'Password123!',
  server: process.env.SQL_SERVER || 'std-sql-server.database.windows.net',
  database: process.env.SQL_DB || 'face-detection-database',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

// Configurare Azure Blob Storage
const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 
  "DefaultEndpointsProtocol=https;AccountName=stdstorage;AccountKey=YourKeyHere;EndpointSuffix=core.windows.net";
const containerName = process.env.STORAGE_CONTAINER || "face-detection";
const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);

// Configurare Azure Face API
const faceApiKey = process.env.FACE_API_KEY || "YourFaceApiKeyHere";
const faceApiEndpoint = process.env.FACE_API_ENDPOINT || "https://std-face-detection.cognitiveservices.azure.com/";

// Debug info endpoint
app.get('/debug', (req, res) => {
  res.json({
    env: {
      storageConnection: storageConnectionString ? 'Configured (hidden)' : 'Not configured',
      faceApiKey: faceApiKey ? 'Configured (hidden)' : 'Not configured',
      faceApiEndpoint: faceApiEndpoint,
      sqlConfig: {
        user: sqlConfig.user,
        server: sqlConfig.server,
        database: sqlConfig.database
      }
    },
    headers: req.headers,
    versions: {
      node: process.version,
      express: require('express/package.json').version,
      multer: require('multer/package.json').version,
      mssql: require('mssql/package.json').version
    }
  });
});

// Endpoint pentru detectarea fețelor
app.post('/api/detect', upload.single('image'), async (req, res) => {
  console.log('API call received: /api/detect');
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No image file provided' });
  }

  console.log('File uploaded:', req.file.originalname, req.file.size, 'bytes');
  
  try {
    // 1. Încărcarea imaginii în Azure Blob Storage
    console.log('Uploading to Azure Blob Storage...');
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Creează containerul dacă nu există
    try {
      await containerClient.createIfNotExists();
      console.log('Container exists or was created successfully');
    } catch (err) {
      console.warn('Warning creating container:', err.message);
    }
    
    const blobName = `${Date.now()}-${path.basename(req.file.originalname)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Citirea fișierului și încărcarea în Blob Storage
    const fileBuffer = fs.readFileSync(req.file.path);
    await blockBlobClient.uploadData(fileBuffer);
    console.log('Blob uploaded successfully:', blobName);
    
    // URL-ul imaginii încărcate
    const blobUrl = blockBlobClient.url;
    
    // 2. Procesarea imaginii cu Azure Face API
    console.log('Calling Azure Face API...');
    const faceDetectionResult = await detectFacesWithAzure(req.file.path);
    console.log('Face detection completed, found', 
      faceDetectionResult.faces ? faceDetectionResult.faces.length : 0, 'faces');
    
    // 3. Salvarea metadatelor în Azure SQL
    console.log('Saving metadata to SQL...');
    await saveMetadataToSql({
      fileName: req.file.originalname,
      blobUrl: blobUrl,
      blobName: blobName,
      timestamp: new Date().toISOString(),
      facesDetected: faceDetectionResult.faces ? faceDetectionResult.faces.length : 0,
      detectionResult: JSON.stringify(faceDetectionResult)
    });
    console.log('Metadata saved successfully');
    
    // 4. Curățarea fișierului temporar
    fs.unlinkSync(req.file.path);
    console.log('Temporary file cleaned up');
    
    // 5. Răspuns către client
    res.json({
      success: true,
      faces: faceDetectionResult.faces,
      resultImageUrl: blobUrl
    });
    
  } catch (error) {
    console.error('Error in face detection process:', error);
    
    // Curățare în caz de eroare
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Cleaned up temporary file after error');
    }
    
    res.status(500).json({ 
      error: 'Failed to process the image', 
      details: error.message 
    });
  }
});


// Endpoint pentru preluarea istoricului detecțiilor
app.get('/api/detections', async (req, res) => {
  console.log('API call received: /api/detections');
  try {
    const detections = await getDetectionsFromSql();
    console.log('Retrieved', detections.length, 'detection records');
    res.json(detections);
  } catch (error) {
    console.error('Error fetching detection history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch detection history', 
      details: error.message 
    });
  }
});

// Funcție pentru detectarea fețelor folosind Azure Face API
async function detectFacesWithAzure(imagePath) {
    try {
      console.log('Reading image file for Face API...');
      // Citirea fișierului de imagine
      const imageBuffer = fs.readFileSync(imagePath);
      
      console.log('Sending request to Face API:', `${faceApiEndpoint}/face/v1.0/detect`);
      // Configurare cerere către Azure Face API
      const response = await axios({
        method: 'post',
        url: `${faceApiEndpoint}/face/v1.0/detect`,
        params: {
          // Minimal parameters
          returnFaceId: false,
          returnFaceLandmarks: false,
          detectionModel: 'detection_01'
        },
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': faceApiKey
        },
        data: imageBuffer
      });
      
      console.log('Face API response status:', response.status);
      
      // Process the response to add placeholder data for the deprecated attributes
      const faces = response.data.map(face => {
        return {
          ...face,
          // Add placeholder data for frontend compatibility
          faceAttributes: {
            age: "N/A (deprecated)",
            gender: "N/A (deprecated)",
            emotion: {
              neutral: 1.0
            }
          }
        };
      });
      
      return {
        faces: faces
      };
    } catch (error) {
      console.error('Error calling Azure Face API:', 
        error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message);
      
      // If using the mock data mode, return sample face data
      if (process.env.USE_MOCK_DATA === 'true') {
        console.log('Using mock face detection data instead');
        return {
          faces: [{
            faceId: "mock-face-id-" + Date.now(),
            faceRectangle: {
              top: 50,
              left: 50,
              width: 200,
              height: 200
            },
            faceAttributes: {
              age: 30,
              gender: "male",
              emotion: {
                neutral: 0.8,
                happiness: 0.1,
                surprise: 0.1
              }
            }
          }]
        };
      }
      
      throw new Error('Face detection API failed: ' + 
        (error.response ? JSON.stringify(error.response.data) : error.message));
    }
  }

// Funcție pentru salvarea metadatelor în Azure SQL
async function saveMetadataToSql(metadata) {
  try {
    console.log('Connecting to SQL database...');
    const pool = await sql.connect(sqlConfig);
    console.log('Connected to SQL database');
    
    // Verificare dacă tabela există și creare dacă nu există
    console.log('Checking if FaceDetections table exists...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FaceDetections')
      BEGIN
          CREATE TABLE FaceDetections (
              id INT IDENTITY(1,1) PRIMARY KEY,
              fileName NVARCHAR(255) NOT NULL,
              blobUrl NVARCHAR(MAX) NOT NULL,
              blobName NVARCHAR(255) NOT NULL,
              timestamp DATETIME NOT NULL,
              facesDetected INT NOT NULL,
              detectionResult NVARCHAR(MAX) NOT NULL
          )
      END
    `);
    console.log('Table FaceDetections exists or was created');
    
    // Mock data for testing without Azure SQL
    const useMockData = 'false';
    
    if (useMockData == 'true') {
      console.log('Using mock data storage instead of SQL (for testing)');
      if (!global.mockDetections) {
        global.mockDetections = [];
      }
      
      metadata.id = global.mockDetections.length + 1;
      global.mockDetections.push(metadata);
      console.log('Saved mock data, total records:', global.mockDetections.length);
      return;
    }
    
    // Inserare metadate
    console.log('Inserting metadata into SQL...');
    await pool.request()
      .input('fileName', sql.NVarChar, metadata.fileName)
      .input('blobUrl', sql.NVarChar, metadata.blobUrl)
      .input('blobName', sql.NVarChar, metadata.blobName)
      .input('timestamp', sql.DateTime, new Date(metadata.timestamp))
      .input('facesDetected', sql.Int, metadata.facesDetected)
      .input('detectionResult', sql.NVarChar, metadata.detectionResult)
      .query(`
        INSERT INTO FaceDetections (fileName, blobUrl, blobName, timestamp, facesDetected, detectionResult)
        VALUES (@fileName, @blobUrl, @blobName, @timestamp, @facesDetected, @detectionResult)
      `);
    console.log('Metadata inserted successfully');
  } catch (error) {
    console.error('Error saving metadata to SQL:', error);
    throw error;
  }
}

// Funcție pentru preluarea istoricului detecțiilor din Azure SQL
async function getDetectionsFromSql() {
  try {
    // Mock data for testing without Azure SQL
    const useMockData = 'false';
    
    if (useMockData == 'true') {
      console.log('Using mock data instead of SQL (for testing)');
      if (!global.mockDetections) {
        global.mockDetections = [];
        
        // Add some sample data for testing
        if (global.mockDetections.length === 0) {
          global.mockDetections.push({
            id: 1,
            fileName: 'sample1.jpg',
            blobUrl: 'https://example.com/sample1.jpg',
            timestamp: new Date(),
            facesDetected: 2
          });
          global.mockDetections.push({
            id: 2,
            fileName: 'sample2.jpg',
            blobUrl: 'https://example.com/sample2.jpg',
            timestamp: new Date(Date.now() - 3600000),
            facesDetected: 1
          });
        }
      }
      
      return global.mockDetections.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    console.log('Connecting to SQL database...');
    const pool = await sql.connect(sqlConfig);
    console.log('Connected to SQL database');
    
    // Verificare dacă tabela există
    console.log('Checking if FaceDetections table exists...');
    const tableResult = await pool.request().query(`
      SELECT OBJECT_ID('FaceDetections') as TableExists
    `);
    
    if (!tableResult.recordset[0].TableExists) {
      console.log('Table FaceDetections does not exist, returning empty array');
      return [];
    }
    
    // Selectare date
    console.log('Querying detection records...');
    const result = await pool.request().query(`
      SELECT id, fileName, blobUrl, timestamp, facesDetected
      FROM FaceDetections
      ORDER BY timestamp DESC
    `);
    
    console.log('Query successful, returned', result.recordset.length, 'records');
    return result.recordset;
  } catch (error) {
    console.error('Error fetching detections from SQL:', error);
    throw error;
  }
}

// Endpoint de bază pentru verificarea stării serverului
app.get('/', (req, res) => {
  res.send('Face Detection API is running!');
});

// Portul pe care va rula serverul
const PORT = process.env.PORT || 89;

// Pornire server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Face Detection server running on port ${PORT}`);
});