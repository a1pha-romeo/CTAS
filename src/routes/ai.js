import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import config, { isAiConfigured } from '../config/env.js';

const router = Router();

router.get('/status', requireAuth, (req, res) => {
  res.json({
    configured: {
      vision: Boolean(config.grok.visionApiKey),
      reasoning: Boolean(config.grok.reasoningApiKey),
      decision: Boolean(config.grok.decisionApiKey)
    },
    models: {
      vision: config.grok.visionModel,
      reasoning: config.grok.reasoningModel,
      decision: config.grok.decisionModel
    },
    apiBase: config.grok.apiBase
  });
});

export default router;
