import { createServer, type Server } from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getCredentialsPath, findConfig } from '@preclaim/core';

const SUPABASE_URL = 'https://aawbukcvngdffueowjsa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd2J1a2N2bmdkZmZ1ZW93anNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjI2NTcsImV4cCI6MjA4OTMzODY1N30.pwAyjgnbdoZmmJdsG2jF0nbvT4hueb8UZvstsdYhFFs';

export async function loginCommand() {
  const server = createServer();

  const port = await new Promise<number>((resolve) => {
    server.listen(0, () => {
      resolve((server.address() as { port: number }).port);
    });
  });

  const redirectTo = `http://localhost:${port}/callback`;
  const oauthUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectTo)}`;

  console.log('Opening browser for GitHub authentication...');
  console.log(`If browser doesn't open, visit:\n${oauthUrl}\n`);

  const { exec } = await import('node:child_process');
  const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCmd} "${oauthUrl}"`);

  await handleAuthCallback(server);
}

function handleAuthCallback(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.on('request', async (req, res) => {
      const url = new URL(req.url!, `http://localhost`);

      if (url.pathname === '/callback') {
        // Supabase implicit flow: tokens come in hash fragment.
        // Serve a page that extracts them and POSTs to /token.
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><body>
<h1>Logging in to Preclaim...</h1>
<script>
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const access_token = params.get('access_token');
const refresh_token = params.get('refresh_token');
const expires_in = params.get('expires_in');
if (access_token) {
  fetch('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token, refresh_token, expires_in })
  }).then(() => {
    document.body.innerHTML = '<h1>Logged in to Preclaim!</h1><p>You can close this tab.</p>';
  });
} else {
  document.body.innerHTML = '<h1>Login failed</h1><p>No token received. Check the URL.</p>';
}
</script></body></html>`);
        return;
      }

      if (url.pathname === '/token' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { access_token, refresh_token, expires_in } = JSON.parse(body);

            // Get user info
            const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'apikey': SUPABASE_ANON_KEY,
              },
            });

            if (!userRes.ok) throw new Error(`Failed to get user info: ${userRes.status}`);

            const user = await userRes.json() as { id: string; email?: string };

            // Save credentials
            const credPath = getCredentialsPath();
            await mkdir(dirname(credPath), { recursive: true });
            await writeFile(credPath, JSON.stringify({
              accessToken: access_token,
              refreshToken: refresh_token,
              expiresAt: new Date(Date.now() + parseInt(expires_in) * 1000).toISOString(),
              user: {
                id: user.id,
                email: user.email ?? '',
                orgId: '',
              },
            }, null, 2) + '\n', { mode: 0o600 });

            res.writeHead(200);
            res.end('ok');

            console.log(`Logged in as ${user.email ?? user.id}`);
            server.close();
            resolve();
          } catch (err) {
            res.writeHead(500);
            res.end('error');
            console.error('Login failed:', err);
            server.close();
            reject(err);
          }
        });
        return;
      }
    });

    setTimeout(() => {
      console.error('Login timed out.');
      server.close();
      process.exit(1);
    }, 120_000);
  });
}
