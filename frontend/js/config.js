/**
 * config.js — single source of truth for environment constants.
 * Change API_BASE_URL here once; every other file reads from CONFIG.
 */

const CONFIG = Object.freeze({
<<<<<<< HEAD
  API_BASE_URL: typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api',
=======
  API_BASE_URL: '/api',
>>>>>>> f5913e1113ce6a4513dd8d3537a7cb1e32da6d3a
  APP_NAME: 'AI Retail',
  APP_SUBTITLE: 'War Room'
});
