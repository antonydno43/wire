import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import healthHandler from './api/health.js';
import sendInviteHandler from './api/send-invite.js';
import sendWelcomeHandler from './api/send-welcome.js';
import supportQueryHandler from './api/support-query.js';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  const adapt =
    (handler: (req: VercelRequest, res: VercelResponse) => unknown) =>
    async (req: express.Request, res: express.Response) => {
      try {
        await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
      } catch (error) {
        console.error('API route error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    };

  app.all('/api/health', adapt(healthHandler));
  app.all('/api/send-invite', adapt(sendInviteHandler));
  app.all('/api/send-welcome', adapt(sendWelcomeHandler));
  app.all('/api/support-query', adapt(supportQueryHandler));

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`YourBiz CRM server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
