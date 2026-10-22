import config from '../../config/env.js';
import { callGrok } from './grokClient.js';

export async function parseTimetableImage(imageBuffer, mimeType = 'image/png') {
  if (!config.grok.visionApiKey) {
    return {
      success: false,
      reason: 'AI_KEY_NOT_CONFIGURED',
      message: 'Grok Vision API key is not configured in .env. Please configure GROK_VISION_API_KEY to enable image extraction.'
    };
  }

  // Scaffolding for Phase 10
  return {
    success: true,
    data: null
  };
}

export default {
  parseTimetableImage
};
