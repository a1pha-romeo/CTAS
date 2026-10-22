import config from '../../config/env.js';

export async function explainClash(violations = [], timetableContext = {}) {
  if (!config.grok.reasoningApiKey) {
    return {
      success: false,
      reason: 'AI_KEY_NOT_CONFIGURED',
      message: 'Grok Reasoning API key is not configured in .env. Showing deterministic validator explanations.',
      explanations: violations.map(v => ({
        code: v.code,
        severity: v.severity,
        summary: v.message,
        reasoning: 'Deterministic constraint violation detected by CTAS scheduling engine.',
        suggestions: ['Review assigned room and faculty availability to resolve this conflict.']
      }))
    };
  }

  // Scaffolding for Phase 11
  return {
    success: true,
    explanations: []
  };
}

export default {
  explainClash
};
