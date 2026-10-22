import config from '../../config/env.js';

export async function rankCandidateOptions(candidates = [], context = {}) {
  if (!config.grok.decisionApiKey) {
    // Deterministic ranking fallback
    return {
      success: true,
      mode: 'deterministic_fallback',
      message: 'Grok Decision key not configured. Using deterministic load-balancing heuristic.',
      rankedOptions: candidates.sort((a, b) => (b.score || 0) - (a.score || 0)),
      justification: 'Ranked purely by deterministic qualification match and daily load limit.'
    };
  }

  // Scaffolding for Phase 12
  return {
    success: true,
    mode: 'ai_ranked',
    rankedOptions: candidates
  };
}

export default {
  rankCandidateOptions
};
