import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function deploymentVerificationPlugin() {
  return {
    name: 'deployment-verification',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const srcHtaccess = path.resolve(__dirname, 'public/.htaccess');
      const destHtaccess = path.resolve(distDir, '.htaccess');
      const destIndex = path.resolve(distDir, 'index.html');
      const destAssets = path.resolve(distDir, 'assets');

      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      // Ensure .htaccess is always in dist
      if (fs.existsSync(srcHtaccess)) {
        fs.copyFileSync(srcHtaccess, destHtaccess);
      }

      // Automatic post-build checks
      const missing: string[] = [];
      if (!fs.existsSync(destIndex)) missing.push('dist/index.html');
      if (!fs.existsSync(destHtaccess)) missing.push('dist/.htaccess');
      if (!fs.existsSync(destAssets)) missing.push('dist/assets');

      if (missing.length > 0) {
        console.warn(`\x1b[33m[DEPLOYMENT CHECK WARNING] Missing critical files: ${missing.join(', ')}\x1b[0m`);
      } else {
        console.log('\x1b[32m[DEPLOYMENT CHECK] dist/index.html, dist/.htaccess, and dist/assets verified successfully.\x1b[0m');
      }
    },
  };
}

// Helper to read local .env file directly so file values override container-level process.env
function readLocalEnvFile(): Record<string, string> {
  const envPath = path.resolve(__dirname, '.env');
  const result: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const equalIdx = trimmed.indexOf('=');
        if (equalIdx > 0) {
          const key = trimmed.slice(0, equalIdx).trim();
          let val = trimmed.slice(equalIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          result[key] = val;
        }
      }
    } catch {
      // ignore
    }
  }
  return result;
}

export default defineConfig(({ mode }) => {
  const fileEnv = readLocalEnvFile();
  const loaded = loadEnv(mode, process.cwd(), 'VITE_');

  // Priority: .env file > loaded env > process.env
  const supabaseUrl = fileEnv.VITE_SUPABASE_URL || loaded.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = fileEnv.VITE_SUPABASE_ANON_KEY || loaded.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [react(), tailwindcss(), deploymentVerificationPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
