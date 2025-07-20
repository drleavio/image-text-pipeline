const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const {
    router: textRoute,
    initializeTextModels,
    textClassifier,
    isTextModelLoading,
    TextClassificationPipeline
  } = require("../textRoute/textRoute");
const {
    router:imageRoute,
    initializeImageModels,
    imageClassifier,
    isImageModelLoading,
    ImageClassificationPipeline
}=require("../imageRoute/imageRoute");
const authMiddleware = require('../middleware');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/image",authMiddleware, imageRoute);
app.use("/api/text",authMiddleware, textRoute);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    models: {
      text: {
        loaded: !!textClassifier,
        loading: isTextModelLoading
      },
      image: {
        loaded: !!imageClassifier,
        loading: isImageModelLoading
      }
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Multi-Modal AI Classification API',
    version: '1.0.0',
    capabilities: ['text-classification', 'image-classification'],
    endpoints: {
      health: 'GET /health',
      textClassify: 'POST /classify/text',
      textBatch: 'POST /classify/text/batch',
      imageClassify: 'POST /classify/image',
      imageBatch: 'POST /classify/image/batch',
      info: 'GET /models/info',
      examples: 'GET /examples'
    }
  });
});

app.get('/models/info', (req, res) => {
  res.json({
    textClassification: {
      model: TextClassificationPipeline?.model || "Unknown",
      task: TextClassificationPipeline?.task || "Unknown",
      loaded: !!textClassifier,
      loading: isTextModelLoading,
      labels: ['POSITIVE', 'NEGATIVE'],
      description: 'DistilBERT model for sentiment analysis'
    },
    imageClassification: {
      model: ImageClassificationPipeline?.model || "Unknown",
      task: ImageClassificationPipeline?.task || "Unknown",
      loaded: !!imageClassifier,
      loading: isImageModelLoading,
      description: 'Vision Transformer for general image classification',
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
    }
  });
});

app.get('/examples', (req, res) => {
  res.json({
    textClassification: {
      single: {
        endpoint: 'POST /classify/text',
        body: { text: 'This product is amazing!' },
        response: {
          success: true,
          type: 'text-classification',
          input: 'This product is amazing!',
          result: { label: 'POSITIVE', score: 0.9991 }
        }
      },
      batch: {
        endpoint: 'POST /classify/text/batch',
        body: { texts: ['Great!', 'Terrible!'] },
        response: {
          success: true,
          type: 'text-classification-batch',
          count: 2,
          results: [
            { label: 'POSITIVE', score: 0.9998 },
            { label: 'NEGATIVE', score: 0.9994 }
          ]
        }
      }
    },
    imageClassification: {
      single: {
        endpoint: 'POST /classify/image',
        method: 'multipart/form-data',
        field: 'image',
        response: {
          success: true,
          type: 'image-classification',
          filename: 'image-123456.jpg',
          result: [
            { label: 'Egyptian cat', score: 0.8234 },
            { label: 'tabby, tabby cat', score: 0.1543 }
          ]
        }
      },
      batch: {
        endpoint: 'POST /classify/image/batch',
        method: 'multipart/form-data',
        field: 'images',
        note: 'Maximum 10 images per batch'
      }
    }
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 10 files per batch.' });
    }
  }

  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed!' });
  }

  console.error('Global error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

const shutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  if (fs.existsSync('uploads')) {
    fs.rmSync('uploads', { recursive: true, force: true });
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function startServer() {
  try {
    await initializeImageModels();
    await initializeTextModels();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
