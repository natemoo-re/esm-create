import fs from 'node:fs';
import * as p from "@clack/prompts";
import { dset as set } from 'dset';
import { execa } from 'execa'

async function main() {
  const yes = process.argv.filter(v => v === '--yes' || v === '-y').length === 1;
  const dirname = new URL('./', import.meta.url).toString().slice(0, -1).split('/').pop();

  const { "init-module": mod, ...npmConfig } = await execa('npm', ['config', 'list', '--json']).then(res => JSON.parse(res.stdout));
  let init = {};
  try {
    init = await import(mod).then(res => res.default);
  } catch (e) {}

  const keys = Object.keys(npmConfig).filter(key => key.startsWith('init') && key.includes('-'));
  const defaults = {
    "name": dirname,
    "type": "module",
    "version": "1.0.0",
    "main": "./index.js",
    "exports": {
        ".": "index.js",
        "./package.json": "./package.json"
    },
    ...init,
  };
  for (const key of keys) {
    if (npmConfig[key]) set(defaults, key.replace('init-', '').replace(/-/g, '.'), npmConfig[key])
  }

  let config = defaults;

  if (!yes) {
    console.log();
    p.intro(`@esm/create`);
    const inputs = await p.group({
        name: () =>
        p.text({
            message: "package name",
            initialValue: defaults.name
        }),
        version: () => p.text({
            message: "version",
            initialValue: defaults.version,
        }),
        description: () => p.text({
            message: "description",
            placeholder: "none",
        }),
        main: () => p.text({
            message: "entry point",
            initialValue: defaults.main,
        }),
        git: () => p.text({
            message: "git repository",
            placeholder: "none"
        }),
    }, { 
        onCancel() {
            p.cancel('Operation cancelled.');
            process.exit(0);
        }
    });
    p.outro('package.json generated')

    Object.assign(config, inputs)
  }
  config.exports["."] = config.main;
  
  fs.writeFileSync('package.json', JSON.stringify(config, null, 2));
}

main().catch(console.error);
