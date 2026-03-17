import { createServer } from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getCredentialsPath, findConfig } from '@preclaim/core';

export async function loginCommand() {
  const found = await findConfig();
  const backend = found?.config.backend ?? 'https://preclaim.vercel.app';

  // Start local server to receive OAuth callback
  const port = await startCallbackServer(backend);

  const loginUrl = `${backend}/api/v1/auth/callback?cli_port=${port}`;

  console.log('Opening browser for authentication...');
  console.log(`If browser doesn't open, visit: ${loginUrl}`);

  // Open browser
  const { exec } = await import('node:child_process');
  const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCmd} "${loginUrl}"`);
}

async function startCallbackServer(backend: string): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');

        if (!code) {
          res.writeHead(400);
          res.end('Missing code');
          return;
        }

        try {
          // Exchange code for tokens
          const tokenRes = await fetch(`${backend}/api/v1/auth/cli`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirect_uri: `http://localhost:${(server.address() as any).port}/callback` }),
          });

          if (!tokenRes.ok) {
            throw new Error(`Token exchange failed: ${tokenRes.status}`);
          }

          const { data } = await tokenRes.json() as { data: { access_token: string; refresh_token: string; expires_at: string; user: { id: string; email: string; org_id: string } } };

          // Save credentials
          const credPath = getCredentialsPath();
          await mkdir(dirname(credPath), { recursive: true });
          await writeFile(credPath, JSON.stringify({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at,
            user: data.user,
          }, null, 2) + '\n', { mode: 0o600 });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Logged in!</h1><p>You can close this tab.</p></body></html>');

          console.log(`Logged in as ${data.user.email}`);
          server.close();
          process.exit(0);
        } catch (err) {
          res.writeHead(500);
          res.end('Login failed');
          console.error('Login failed:', err);
          server.close();
          process.exit(1);
        }
      }
    });

    server.listen(0, () => {
      const addr = server.address() as { port: number };
      resolve(addr.port);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      console.error('Login timed out.');
      server.close();
      process.exit(1);
    }, 120_000);
  });
}
