import {mkdir,copyFile,readFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=resolve(root,'.agents/skills/sango-officer-art');
const destination=resolve(process.env.CODEX_HOME||join(homedir(),'.codex'),'skills/sango-officer-art');
for(const file of ['SKILL.md','agents/openai.yaml']){const to=resolve(destination,file);await mkdir(dirname(to),{recursive:true});await copyFile(resolve(source,file),to);if(!(await readFile(to)).equals(await readFile(resolve(source,file))))throw Error('Skill copy mismatch');}
console.log(destination);
