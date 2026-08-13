/**
 * config.js — single source of truth for environment constants.
 * Change API_BASE_URL here once; every other file reads from CONFIG.
 */

const CONFIG = Object.freeze({
  API_BASE_URL: typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api',
  APP_NAME: 'AI Retail',
  APP_SUBTITLE: 'War Room'
});