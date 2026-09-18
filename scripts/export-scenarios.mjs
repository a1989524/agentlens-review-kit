import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {buildScenarios} from '../examples/scenarios.mjs';
const file = resolve(process.argv[2] ?? 'scenarios.json');
await mkdir(dirname(file),{recursive:true});
await writeFile(file,JSON.stringify({schema_version:1,source:'AgentLens Review Kit',synthetic:true,scenarios:buildScenarios()},null,2)+'\n');
console.log(`Exported 4 executable scenarios to ${file}`);
