import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT === '8080' ? 3000 : parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'ctas_default_super_secret_key_change_in_production',
  dbPath: path.resolve(rootDir, process.env.DB_PATH || './data/timetable.db'),
  uploadsDir: path.resolve(rootDir, './uploads'),
  
  // AI Configuration (Gemini & Grok)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: 'gemini-3.8-flash',
  grok: {
    apiBase: process.env.GROK_API_BASE || 'https://api.x.ai/v1',
    visionApiKey: process.env.GROK_VISION_API_KEY || '',
    visionModel: process.env.GROK_VISION_MODEL || 'grok-2-vision-1212',
    reasoningApiKey: process.env.GROK_REASONING_API_KEY || '',
    reasoningModel: process.env.GROK_REASONING_MODEL || 'grok-2-1212',
    decisionApiKey: process.env.GROK_DECISION_API_KEY || '',
    decisionModel: process.env.GROK_DECISION_MODEL || 'grok-2-1212'
  }
};

export function isAiConfigured(type = 'all') {
  const hasGemini = Boolean(config.geminiApiKey);
  if (type === 'vision') return hasGemini || Boolean(config.grok.visionApiKey);
  if (type === 'reasoning') return hasGemini || Boolean(config.grok.reasoningApiKey);
  if (type === 'decision') return hasGemini || Boolean(config.grok.decisionApiKey);
  return hasGemini || Boolean(config.grok.visionApiKey || config.grok.reasoningApiKey || config.grok.decisionApiKey);
}

export default config;
