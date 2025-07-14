const express=require("express")
const path = require('path');
const fs = require('fs');
const { pipeline, env } = require('@xenova/transformers');



class TextClassificationPipeline {
  static task = 'text-classification';
  static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

let textClassifier = null;
let isTextModelLoading = false;
const router=express.Router();

async function initializeTextModels(){
    try {
        console.log('🚀 Initializing AI models...');
        isTextModelLoading = true;
        console.log('📝 Loading text classification model...');
        textClassifier = await TextClassificationPipeline.getInstance((progress) => {
          if (progress.status === 'downloading') {
            console.log(`📥 Text Model: ${progress.name} - ${Math.round(progress.progress)}%`);
          }
        });
        isTextModelLoading = false;
        console.log('✅ Text classification model loaded!');
        const textTest = await textClassifier('This is a test message');
        console.log('🧪 Text model test:', textTest);
    } catch (error) {
        isTextModelLoading = false;
        console.error('❌ Error initializing models:', error);
    }
   
}

router.post('/classify/text', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          error: 'Missing or invalid text field',
          example: { text: 'This is a great product!' }
        });
      }
      
      if (isTextModelLoading) {
        return res.status(503).json({ 
          error: 'Text model is still loading. Please try again in a moment.' 
        });
      }
      
      if (!textClassifier) {
        return res.status(503).json({ 
          error: 'Text model not initialized.' 
        });
      }
      
      const startTime = Date.now();
      const result = await textClassifier(text);
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        type: 'text-classification',
        input: text,
        result: result,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Text classification error:', error);
      res.status(500).json({ 
        error: 'Text classification failed',
        message: error.message 
      });
    }
  });

  router.post('/classify/text/batch', async (req, res) => {
    try {
      const { texts } = req.body;
      
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ 
          error: 'Missing or invalid texts field (must be non-empty array)',
          example: { texts: ['Great product!', 'Poor service'] }
        });
      }
      
      if (texts.length > 100) {
        return res.status(400).json({ 
          error: 'Maximum 100 texts allowed per batch' 
        });
      }
      
      if (isTextModelLoading || !textClassifier) {
        return res.status(503).json({ 
          error: 'Text model not ready' 
        });
      }
      
      const startTime = Date.now();
      const results = await textClassifier(texts);
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        type: 'text-classification-batch',
        count: texts.length,
        inputs: texts,
        results: results,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Text batch classification error:', error);
      res.status(500).json({ 
        error: 'Text batch classification failed',
        message: error.message 
      });
    }
  });



  module.exports = {
    router,
    initializeTextModels,
    textClassifier,
    isTextModelLoading,
    TextClassificationPipeline
  };