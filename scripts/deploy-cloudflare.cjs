/**
 * Script de déploiement automatique 1-Clic sur Cloudflare
 * Usage: node scripts/deploy-cloudflare.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

process.env.CI = 'true';
process.env.WRANGLER_SEND_METRICS = 'false';

console.log('\n======================================================');
console.log('🚀 DÉPLOIEMENT DU COMPAGNON DE CÉRÉMONIE SUR CLOUDFLARE');
console.log('======================================================\n');

try {
  // 1. Compilation du frontend
  console.log('📦 1/3 Compilation du Frontend PWA avec Vite...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend compilé dans dist/\n');

  // 2. Déploiement Cloudflare
  console.log('⚡ 2/3 Déploiement sur Cloudflare Workers & Assets...');
  execSync('npx wrangler deploy', { stdio: 'inherit' });
  console.log('✅ Application déployée avec succès !\n');

  console.log('======================================================');
  console.log('🎉 Votre Compagnon de Cérémonie est en ligne !');
  console.log('👉 Les invités peuvent scanner le QR code pour participer.');
  console.log('======================================================\n');

} catch (err) {
  console.error('\n❌ Erreur pendant le déploiement :', err.message);
  process.exit(1);
}
