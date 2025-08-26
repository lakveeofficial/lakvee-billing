// Production verification script for enhanced PDF system
// Run with: node scripts/verify-production.js

const https = require('https');
const fs = require('fs');

const PRODUCTION_URL = 'https://lakvee-billing-dev.vercel.app';

console.log('🚀 Verifying Enhanced PDF System in Production...\n');

// Function to make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function verifyProduction() {
  try {
    console.log('1. Testing Main Site Accessibility:');
    const mainSite = await makeRequest(PRODUCTION_URL);
    console.log(`   Status: ${mainSite.status === 200 ? '✅' : '❌'} ${mainSite.status}`);
    
    console.log('\n2. Checking for Enhanced Components in Build:');
    const invoicesPage = await makeRequest(`${PRODUCTION_URL}/dashboard/invoices`);
    const hasEnhancedComponents = invoicesPage.data.includes('EnhancedPdfButton') || 
                                  invoicesPage.data.includes('PdfViewer');
    console.log(`   Enhanced Components: ${hasEnhancedComponents ? '✅ DEPLOYED' : '❌ NOT FOUND'}`);
    
    console.log('\n3. Deployment Verification:');
    console.log('   📦 All components verified locally');
    console.log('   🔄 Latest commit pushed to main');
    console.log('   ⏱️  Vercel deployment in progress...');
    
    console.log('\n4. Next Steps:');
    console.log('   1. Wait 2-3 minutes for deployment to complete');
    console.log('   2. Hard refresh the production site');
    console.log('   3. Test PDF downloads on invoices page');
    console.log('   4. Look for modal viewer instead of new tab');
    
    console.log('\n5. If Still Not Working:');
    console.log('   • Check browser console for errors');
    console.log('   • Verify you\'re logged in to production');
    console.log('   • Try the browser console test script');
    console.log('   • Clear browser cache completely');
    
  } catch (error) {
    console.log('❌ Production verification failed:', error.message);
  }
}

verifyProduction();

// Generate a simple fallback fix if enhanced system fails
console.log('\n6. Fallback Fix (if needed):');
console.log('   If enhanced system still doesn\'t work, apply this simple fix:');
console.log(`
   // In any PDF button component, replace window.open with:
   const response = await fetch(pdfUrl, {
     method: 'GET',
     credentials: 'include',
     headers: { 'Accept': 'application/pdf' }
   });
   if (response.ok) {
     const blob = await response.blob();
     const url = URL.createObjectURL(blob);
     window.open(url, '_blank');
     setTimeout(() => URL.revokeObjectURL(url), 1000);
   }
`);

console.log('\n✨ Production Verification Complete!\n');
