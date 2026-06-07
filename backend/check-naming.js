const fs = require('fs');
const path = require('path');
const classSuffixes = {
  'entity.ts': ['Entity'],
  'vo.ts': ['VO', 'ValueObject'],
  'event.ts': ['Event'],
  'command.ts': ['Command'],
  'query.ts': ['Query'],
  'handler.ts': ['Handler'],
  'port.ts': ['Port', 'Interface'],
  'controller.ts': ['Controller'],
  'repository.ts': ['Repository'],
  'adapter.ts': ['Adapter'],
  'module.ts': ['Module'],
};

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) results = results.concat(walk(p));
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) results.push(p);
  }
  return results;
}

const srcPath = 'src/modules';
for (const mod of fs.readdirSync(srcPath)) {
  const modPath = path.join(srcPath, mod);
  if (!fs.statSync(modPath).isDirectory()) continue;
  for (const file of walk(modPath)) {
    const fileName = path.basename(file);
    const content = fs.readFileSync(file, 'utf-8');
    const regex = /export\s+(class|interface|abstract\s+class)\s+(\w+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const className = match[2];
      for (const [pattern, suffixes] of Object.entries(classSuffixes)) {
        if (fileName.includes(pattern)) {
          if (!suffixes.some(s => className.endsWith(s))) {
            console.log(mod + ': ' + fileName + ' => ' + className + ' (expected: ' + suffixes.join('|') + ')');
          }
        }
      }
    }
  }
}
