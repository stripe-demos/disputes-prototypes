import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TEMPLATES, getTemplate, getNextId } from './scripts/templates/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypesDir = path.join(__dirname, 'src', 'prototypes');
const configPath = path.join(prototypesDir, 'config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

export default function prototypeApiPlugin() {
  return {
    name: 'prototype-api',
    configureServer(server) {
      server.middlewares.use('/__api/templates', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(TEMPLATES));
      });

      server.middlewares.use('/__api/prototypes', (req, res) => {
        // Handle PATCH /__api/prototypes/:id
        if (req.method === 'PATCH') {
          const id = req.url.replace(/^\//, '');
          if (!id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing prototype id' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const updates = JSON.parse(body);
              const config = readConfig();
              if (!config[id]) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Prototype "${id}" not found` }));
                return;
              }

              if (updates.name !== undefined) config[id].name = updates.name.trim();
              if (updates.description !== undefined) config[id].description = updates.description.trim();
              if (updates.status !== undefined && (updates.status === 'active' || updates.status === 'archived')) {
                config[id].status = updates.status;
              }

              writeConfig(config);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));

              server.ws.send({ type: 'full-reload' });
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Handle DELETE /__api/prototypes/:id
        if (req.method === 'DELETE') {
          const id = req.url.replace(/^\//, '');
          if (!id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing prototype id' }));
            return;
          }

          const config = readConfig();
          if (!config[id]) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Prototype "${id}" not found` }));
            return;
          }

          // Can't delete the last prototype
          if (Object.keys(config).length <= 1) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Cannot delete the last prototype' }));
            return;
          }

          // Remove directory
          const dir = path.join(prototypesDir, id);
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true });
          }

          // Remove from config
          delete config[id];
          writeConfig(config);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));

          // Trigger full reload
          server.ws.send({ type: 'full-reload' });
          return;
        }

        // Handle POST /__api/prototypes
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { name, description = '', template = 'dashboard-shell' } = JSON.parse(body);

              if (!name || !name.trim()) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Name is required' }));
                return;
              }

              const generator = getTemplate(template);
              if (!generator) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Unknown template "${template}"` }));
                return;
              }

              const id = getNextId(prototypesDir);
              const files = generator(id, name.trim(), description.trim());

              // Create directory and write files
              const dir = path.join(prototypesDir, id);
              fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });

              for (const [relativePath, content] of Object.entries(files)) {
                const filePath = path.join(dir, relativePath);
                const fileDir = path.dirname(filePath);
                if (!fs.existsSync(fileDir)) {
                  fs.mkdirSync(fileDir, { recursive: true });
                }
                fs.writeFileSync(filePath, content);
              }

              // Update config
              const config = readConfig();
              config[id] = { name: name.trim(), description: description.trim(), status: 'active' };
              writeConfig(config);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, id }));

              // Trigger full reload
              server.ws.send({ type: 'full-reload' });
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      });
    },
  };
}
