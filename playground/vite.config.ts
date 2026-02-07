import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const libRoot = path.resolve(__dirname, '../packages/calendar');

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: isDev
        ? {
            // Library's internal path alias (must come first)
            '@': path.resolve(libRoot, 'src'),
            // Redirect library imports to source
            '@savvycal/calendar': path.resolve(libRoot, 'src/index.ts'),
          }
        : {},
    },
    ...(!isDev && {
      optimizeDeps: {
        exclude: ['@savvycal/calendar'],
      },
    }),
  };
});
