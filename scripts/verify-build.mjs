import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('====================================================');
console.log('         PRODUCTION BUILD VERIFICATION TOOL         ');
console.log('====================================================');
console.log(`Checking build output in: ${distDir}\n`);

let passed = true;
const errors = [];
const warnings = [];

// 1. Check dist directory
if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
  passed = false;
  errors.push('CRITICAL: Thư mục "dist" không tồn tại. Hãy chạy "npm run build" trước.');
} else {
  console.log(' [✓] dist directory: EXISTS');
}

// 2. Check dist/index.html
const indexHtmlPath = path.resolve(distDir, 'index.html');
let indexHtmlContent = '';
if (!fs.existsSync(indexHtmlPath)) {
  passed = false;
  errors.push('CRITICAL: File "dist/index.html" không tồn tại.');
} else {
  indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  if (indexHtmlContent.trim().length === 0) {
    passed = false;
    errors.push('CRITICAL: File "dist/index.html" rỗng (0 bytes).');
  } else {
    console.log(' [✓] dist/index.html: EXISTS (' + indexHtmlContent.length + ' bytes)');
  }
}

// 3. Check dist/.htaccess
const htaccessPath = path.resolve(distDir, '.htaccess');
if (!fs.existsSync(htaccessPath)) {
  passed = false;
  errors.push('CRITICAL: File "dist/.htaccess" không tồn tại. Apache sẽ không thể điều hướng React SPA.');
} else {
  const htaccessContent = fs.readFileSync(htaccessPath, 'utf8');
  if (!htaccessContent.includes('RewriteEngine') || !htaccessContent.includes('index.html')) {
    passed = false;
    errors.push('CRITICAL: File "dist/.htaccess" thiếu cấu hình RewriteEngine hoặc rewrite về index.html.');
  } else {
    console.log(' [✓] dist/.htaccess: EXISTS (Chứa đầy đủ mod_rewrite SPA fallback)');
  }
}

// 4. Check dist/assets
const assetsDir = path.resolve(distDir, 'assets');
let assetFiles = [];
if (!fs.existsSync(assetsDir) || !fs.statSync(assetsDir).isDirectory()) {
  passed = false;
  errors.push('CRITICAL: Thư mục "dist/assets" không tồn tại.');
} else {
  assetFiles = fs.readdirSync(assetsDir);
  const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
  const cssFiles = assetFiles.filter(f => f.endsWith('.css'));

  if (jsFiles.length === 0) {
    passed = false;
    errors.push('CRITICAL: Không tìm thấy file JavaScript nào trong "dist/assets".');
  } else {
    console.log(` [✓] dist/assets: EXISTS (${assetFiles.length} files: ${jsFiles.length} JS, ${cssFiles.length} CSS)`);
  }
}

// 5. Check index.html references to assets
if (indexHtmlContent) {
  const scriptRegex = /src=["'](?:\/)?assets\/([^"']+)["']/g;
  const linkRegex = /href=["'](?:\/)?assets\/([^"']+)["']/g;

  let scriptMatch;
  let hasScriptAsset = false;
  while ((scriptMatch = scriptRegex.exec(indexHtmlContent)) !== null) {
    hasScriptAsset = true;
    const referencedFile = scriptMatch[1];
    const fullAssetPath = path.resolve(assetsDir, referencedFile);
    if (!fs.existsSync(fullAssetPath)) {
      passed = false;
      errors.push(`CRITICAL: index.html tham chiếu file JS "${referencedFile}" nhưng không tìm thấy trong dist/assets!`);
    } else {
      console.log(` [✓] Script Asset Reference: ${referencedFile} -> OK`);
    }
  }

  let linkMatch;
  let hasCssAsset = false;
  while ((linkMatch = linkRegex.exec(indexHtmlContent)) !== null) {
    hasCssAsset = true;
    const referencedFile = linkMatch[1];
    const fullAssetPath = path.resolve(assetsDir, referencedFile);
    if (!fs.existsSync(fullAssetPath)) {
      passed = false;
      errors.push(`CRITICAL: index.html tham chiếu file CSS "${referencedFile}" nhưng không tìm thấy trong dist/assets!`);
    } else {
      console.log(` [✓] Style Asset Reference: ${referencedFile} -> OK`);
    }
  }

  if (!hasScriptAsset) {
    passed = false;
    errors.push('CRITICAL: index.html không chứa thẻ tham chiếu script bundle trong /assets/.');
  }
}

// Check deployment-check.html in dist
const deploymentCheckHtml = path.resolve(distDir, 'deployment-check.html');
if (fs.existsSync(deploymentCheckHtml)) {
  console.log(' [✓] dist/deployment-check.html: EXISTS (Static Health Check Ready)');
} else {
  warnings.push('Ghi chú: dist/deployment-check.html chưa được copy từ public.');
}

console.log('\n----------------------------------------------------');
if (warnings.length > 0) {
  console.log('CẢNH BÁO:');
  warnings.forEach(w => console.log(' ! ' + w));
  console.log('----------------------------------------------------');
}

if (!passed) {
  console.log('\nDANH SÁCH LỖI:');
  errors.forEach(e => console.error(' ✗ ' + e));
  console.log('\n====================================================');
  console.error('BUILD VERIFICATION FAILED');
  console.log('====================================================\n');
  process.exit(1);
} else {
  console.log('\n====================================================');
  console.log('BUILD VERIFICATION PASSED');
  console.log('====================================================\n');
  process.exit(0);
}
