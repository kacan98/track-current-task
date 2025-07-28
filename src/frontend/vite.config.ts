import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-activity-log',
      configureServer(server) {
        const csvPath = resolve(__dirname, '../../.TrackCurrentTask/activity_log.csv');
        server.middlewares.use('/.TrackCurrentTask/activity_log.csv', (_req, res) => {
          if (fs.existsSync(csvPath)) {
            res.setHeader('Content-Type', 'text/csv');
            fs.createReadStream(csvPath).pipe(res);
          } else {
            res.statusCode = 404;
            res.end('Not found');
          }
        });
      },
    },
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/jira': 'http://localhost:9999',
    },
    fs: {
      allow: [
        resolve(__dirname, '../../.TrackCurrentTask'),
        resolve(__dirname, './'),
      ],
    },
  },
});
