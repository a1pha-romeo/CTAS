import { GoogleGenAI } from '@google/genai';
import config from '../../config/env.js';

let aiInstance = null;

export function getGeminiClient() {
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null;

  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  return aiInstance;
}

export function isGeminiActive() {
  return Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY);
}

export default {
  getGeminiClient,
  isGeminiActive
};
