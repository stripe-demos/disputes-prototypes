import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { TEMPLATES, getTemplate, getNextId } from './templates/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypesDir = path.join(__dirname, '..', 'src', 'prototypes');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) parsed.name = args[++i];
    else if (args[i] === '--description' && args[i + 1]) parsed.description = args[++i];
    else if (args[i] === '--template' && args[i + 1]) parsed.template = args[++i];
  }
  return parsed;
}

const cliArgs = parseArgs();
const id = getNextId(prototypesDir);

console.log(`\nCreating ${id}...\n`);
const displayName = cliArgs.name || (await prompt(`  Name (${id}): `)).trim() || id;
const description = cliArgs.description ?? (await prompt(`  Description (optional): `)).trim();

// Template selection
let templateId = cliArgs.template;
if (!templateId) {
  console.log('\n  Available templates:');
  TEMPLATES.forEach((t, i) => console.log(`    ${i + 1}. ${t.name} — ${t.description}`));
  const choice = (await prompt(`\n  Template (1): `)).trim();
  const idx = parseInt(choice, 10) - 1;
  templateId = (idx >= 0 && idx < TEMPLATES.length) ? TEMPLATES[idx].id : TEMPLATES[0].id;
}

const generator = getTemplate(templateId);
if (!generator) {
  console.error(`Error: unknown template "${templateId}". Available: ${TEMPLATES.map(t => t.id).join(', ')}`);
  process.exit(1);
}

console.log(`  Using template: ${templateId}`);
console.log('');

const dir = path.join(prototypesDir, id);

if (fs.existsSync(dir)) {
  console.error(`Error: prototype "${id}" already exists at ${dir}`);
  process.exit(1);
}

// Generate files from template
const files = generator(id, displayName, description);
fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });

for (const [relativePath, content] of Object.entries(files)) {
  const filePath = path.join(dir, relativePath);
  const fileDir = path.dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

// Append to shared config.json
const configPath = path.join(prototypesDir, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
config[id] = { name: displayName, description, status: 'active' };
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

console.log(`\n✅ Created prototype "${displayName}" (${id})\n`);
console.log(`Files created:`);
for (const relativePath of Object.keys(files)) {
  console.log(`  src/prototypes/${id}/${relativePath}`);
}
console.log(`  src/prototypes/config.json (updated)\n`);
console.log(`Next steps:`);
console.log(`  1. Navigate to /${id} in your dev server`);
console.log(`  2. Edit src/prototypes/${id}/pages/ to build your pages`);
console.log(`  3. Add routes in src/prototypes/${id}/App.jsx`);
console.log(`  4. Update name/description in src/prototypes/config.json`);
console.log(`  5. To remove: delete src/prototypes/${id}/ and its entry in config.json\n`);
