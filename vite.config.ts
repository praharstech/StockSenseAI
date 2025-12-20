
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Add comment above each fix
  // Fix: use process.cwd() from the imported process module to resolve Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for seamless Vercel integration
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    build: {
      outDir: '.',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000
    }
  };
});
