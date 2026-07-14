import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * This is a Vercel Serverless Function that acts as a proxy specifically for the
 * ChirpStack authentication endpoint (`/auth/token`).
 *
 * It forwards the client's request to the real ChirpStack API server, captures the
 * response (which should contain the JWT token), and then sends it back to the client.
 *
 * File-based Routing:
 * This file is placed at `api/proxy/auth/token.ts`, so Vercel will automatically
 * route any requests to `/api/proxy/auth/token` to this function.
 *
 * @param {VercelRequest} req The incoming request object from the client.
 * @param {VercelResponse} res The response object to send back to the client.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for this endpoint
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The target URL for the real authentication API.
  // Use an environment variable for flexibility, with a fallback.
  const targetUrl = process.env.VITE_API_BASE_URL || "https://smartsolar-th.com/api/v1";
  const authUrl = `${targetUrl}/auth/token`;

  try {
    // The client sends data as 'application/x-www-form-urlencoded',
    // which Vercel automatically parses into `req.body`.
    // We need to re-encode it for the backend.
    const params = new URLSearchParams();
    for (const key in req.body) {
      params.append(key, req.body[key]);
    }

    // Forward the request to the actual ChirpStack API
    const apiResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // Send the response from the ChirpStack API back to the original client
    res.status(apiResponse.status).json(await apiResponse.json());
  } catch (error: any) {
    console.error('Auth proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from authentication service', details: error.message });
  }
}