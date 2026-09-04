const http = require('http');
const fs = require('fs');
const path = require('path');
const database = require('./database');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MAX_BODY = 20 * 1024;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function handleAI(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    return sendJson(res, 503, { error: 'AI is not configured. Set OPENAI_API_KEY on the server.' });
  }

  try {
    const { message } = await readJson(req);
    if (typeof message !== 'string' || !message.trim()) {
      return sendJson(res, 400, { error: 'Please enter a programming question.' });
    }

    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
        instructions: 'You are Caleb Code AI, a friendly beginner programming tutor. Explain concepts clearly, help debug step by step, and encourage learning. When giving code, explain the important parts.',
        input: message.trim(),
        max_output_tokens: 1200
      })
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      return sendJson(res, apiResponse.status, {
        error: data.error?.message || `OpenAI request failed (${apiResponse.status}).`
      });
    }

    return sendJson(res, 200, { reply: data.output_text || 'I could not generate a response.' });
  } catch (error) {
    console.error('AI error:', error.message);
    return sendJson(res, 500, { error: 'The AI server could not process that request.' });
  }
}

async function handleMessage(req, res) {
  try {
    const { name, email, message } = await readJson(req);
    if (!name || !email || !message) return sendJson(res, 400, { error: 'Name, email and message are required.' });
    database.saveMessage(String(name).trim(), String(email).trim(), String(message).trim());
    return sendJson(res, 201, { success: true, message: 'Message saved successfully.' });
  } catch {
    return sendJson(res, 400, { error: 'Could not save the message.' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/api/ai') return handleAI(req, res);
  if (req.method === 'POST' && req.url === '/api/messages') return handleMessage(req, res);
  if (req.method === 'GET' && req.url === '/api/stats') return sendJson(res, 200, { visitors: database.getVisitorCount() });
  if (req.method === 'POST' && req.url === '/api/visit') return sendJson(res, 200, { visitors: database.addVisitor() });

  let requestedPath;
  try { requestedPath = decodeURIComponent(req.url.split('?')[0]); } catch { return sendJson(res, 400, { error: 'Bad request.' }); }
  if (requestedPath === '/') requestedPath = '/index.html';

  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (statError, stats) => {
    if (!statError && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      return fs.createReadStream(filePath).pipe(res);
    }
    fs.readFile(path.join(ROOT, 'index.html'), (error, data) => {
      if (error) return sendJson(res, 500, { error: 'Server error.' });
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  });
});

server.listen(PORT, () => console.log(`Portfolio server running at http://localhost:${PORT}`));
