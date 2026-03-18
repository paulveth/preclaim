import packageJson from '../../../../package.json';

// GET /api/v1/version — Return server version
export async function GET() {
  return Response.json({ version: packageJson.version });
}
