import 'dotenv/config';
import { app } from '../server';
import type { IncomingMessage, ServerResponse } from 'http';

// Vercel Serverless Function handler for Express app
// This adds CORS support and handles preflight requests

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle OPTIONS/preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.writeHead(204).end();
  }

  // Pass the request to the Express app
  // Express will handle JSON body parsing through its express.json() middleware
  return app(req, res);
}