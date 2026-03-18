import { createServer, type Server } from 'node:http';
import { getSupabaseConfig, saveCredentials } from '@preclaim/core';

export async function loginCommand() {
  const supabaseConfig = getSupabaseConfig();
  const server = createServer();

  const port = await new Promise<number>((resolve) => {
    server.listen(0, () => {
      resolve((server.address() as { port: number }).port);
    });
  });

  const redirectTo = `http://localhost:${port}/callback`;
  const oauthUrl = `${supabaseConfig.url}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectTo)}`;

  console.log('Opening browser for GitHub authentication...');
  console.log(`If browser doesn't open, visit:\n${oauthUrl}\n`);

  const { exec } = await import('node:child_process');
  const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCmd} "${oauthUrl}"`);

  await handleAuthCallback(server, supabaseConfig);
}

function handleAuthCallback(
  server: Server,
  supabase: { url: string; anonKey: string },
): Promise<void> {
  return new Promise((resolve, reject) => {
    server.on('request', async (req, res) => {
      const url = new URL(req.url!, `http://localhost`);

      if (url.pathname === '/callback') {
        // Check for PKCE flow (code in query params)
        const code = url.searchParams.get('code');
        if (code) {
          // PKCE flow: exchange code for session server-side
          try {
            const tokenRes = await fetch(`${supabase.url}/auth/v1/token?grant_type=pkce`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabase.anonKey,
              },
              body: JSON.stringify({
                auth_code: code,
                code_verifier: url.searchParams.get('code_verifier') ?? '',
              }),
            });

            if (tokenRes.ok) {
              const data = await tokenRes.json() as {
                access_token: string;
                refresh_token: string;
                expires_in: number;
                user: { id: string; email?: string };
              };

              await saveCredentials({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
                user: {
                  id: data.user.id,
                  email: data.user.email ?? '',
                  orgId: '',
                },
              });

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<!DOCTYPE html><html><body><h1>Logged in to Preclaim!</h1><p>You can close this tab.</p></body></html>');
              console.log(`Logged in as ${data.user.email ?? data.user.id}`);
              server.close();
              resolve();
              return;
            }
          } catch {
            // Fall through to implicit flow page
          }
        }

        // Implicit flow: tokens in hash fragment (client-side extraction)
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><body>
<h1>Logging in to Preclaim...</h1>
<script>
// Try hash fragment (implicit flow)
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
            const userRes = await fetch(`${supabase.url}/auth/v1/user`, {
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'apikey': supabase.anonKey,
              },
            });

            if (!userRes.ok) throw new Error(`Failed to get user info: ${userRes.status}`);

            const user = await userRes.json() as { id: string; email?: string };

            await saveCredentials({
              accessToken: access_token,
              refreshToken: refresh_token,
              expiresAt: new Date(Date.now() + parseInt(expires_in) * 1000).toISOString(),
              user: {
                id: user.id,
                email: user.email ?? '',
                orgId: '',
              },
            });

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
      server.close(() => process.exit(1));
    }, 120_000);
  });
}
