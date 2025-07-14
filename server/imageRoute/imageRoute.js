const multer = require('multer');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { pipeline, env } = require('@xenova/transformers');
const router=express.Router()


class ImageClassificationPipeline {
    static task = 'image-classification';
    static model = 'Xenova/vit-base-patch16-224'; // Vision Transformer for image classification
    static instance = null;
  
    static async getInstance(progress_callback = null) {
      if (this.instance === null) {
        this.instance = pipeline(this.task, this.model, { progress_callback });
      }
      return this.instance;
    }
  }


 const storage = multer.diskStorage({
   destination: function (req, file, cb) {
     const uploadDir = 'uploads/';
     if (!fs.existsSync(uploadDir)) {
       fs.mkdirSync(uploadDir, { recursive: true });
     }
     cb(null, uploadDir);
   },
   filename: function (req, file, cb) {
     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
   }
 });
 
 const upload = multer({ 
   storage: storage,
   limits: {
     fileSize: 5 * 1024 * 1024 
   },
   fileFilter: (req, file, cb) => {
     if (file.mimetype.startsWith('image/')) {
       cb(null, true);
     } else {
       cb(new Error('Only image files are allowed!'), false);
     }
   }
 });
 
 let imageClassifier = null;

let isImageModelLoading = false;

async function initializeImageModels() {
    try {
      console.log('🚀 Initializing AI models...');
      isImageModelLoading = true;
      console.log('🖼️ Loading image classification model...');
      imageClassifier = await ImageClassificationPipeline.getInstance((progress) => {
        if (progress.status === 'downloading') {
          console.log(`📥 Image Model: ${progress.name} - ${Math.round(progress.progress)}%`);
        }
      });
      isImageModelLoading = false;
      console.log('✅ Image classification model loaded!');
      
      console.log('🎉 All models initialized successfully!');
            
    } catch (error) {
      isTextModelLoading = false;
      isImageModelLoading = false;
      console.error('❌ Error initializing models:', error);
    }
  }

  function cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
  router.use('/uploads', express.static('uploads'));

  router.post('/classify/image', upload.single('image'), async (req, res) => {
    let filePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No image file provided',
          note: 'Send image as multipart/form-data with field name "image"'
        });
      }
      
      filePath = req.file.path;
      
      if (isImageModelLoading) {
        return res.status(503).json({ 
          error: 'Image model is still loading. Please try again in a moment.' 
        });
      }
      
      if (!imageClassifier) {
        return res.status(503).json({ 
          error: 'Image model not initialized.' 
        });
      }
      
      const startTime = Date.now();
      const result = await imageClassifier(filePath);
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        type: 'image-classification',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        result: result,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Image classification error:', error);
      res.status(500).json({ 
        error: 'Image classification failed',
        message: error.message 
      });
    } finally {
      if (filePath) {
        setTimeout(() => cleanupFile(filePath), 5000); // Clean up after 5 seconds
      }
    }
  });


  router.post('/classify/image/batch', upload.array('images', 10), async (req, res) => {
    let filePaths = [];
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          error: 'No image files provided',
          note: 'Send images as multipart/form-data with field name "images"'
        });
      }
      
      filePaths = req.files.map(file => file.path);
      
      if (isImageModelLoading || !imageClassifier) {
        return res.status(503).json({ 
          error: 'Image model not ready' 
        });
      }
      
      const startTime = Date.now();
      const results = [];
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const result = await imageClassifier(file.path);
        results.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          result: result
        });
      }
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        type: 'image-classification-batch',
        count: req.files.length,
        results: results,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Image batch classification error:', error);
      res.status(500).json({ 
        error: 'Image batch classification failed',
        message: error.message 
      });
    } finally {
      filePaths.forEach(filePath => {
        setTimeout(() => cleanupFile(filePath), 5000);
      });
    }
  });

  module.exports={router,initializeImageModels, imageClassifier, isImageModelLoading, ImageClassificationPipeline}