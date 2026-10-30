import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, mkdir, rename, unlink, lstat } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { editable } from './rules.mjs';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const readJSON = async file => JSON.parse(await readFile(file, 'utf8'));
export const exists = async file => lstat(file).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
export async function atomic(file, bytes) {
  await mkdir(dirname(file), { recursive: true });
  const temp = file + '.' + randomBytes(6).toString('hex') + '.tmp';
  await writeFile(temp, bytes, { flag: 'wx' });
  try { await rename(temp, file); } catch (error) { await unlink(temp).catch(() => {}); throw error; }
}
export const writeJSON = (file, value) => atomic(file, JSON.stringify(value, null, 2) + '\n');

export function inside(root, path) {
  const rel = relative(resolve(root), resolve(path));
  assert.ok(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Path must stay inside its declared directory');
  return resolve(path);
}

export async function sourceFiles(root) {
  const files = [];
  async function walk(folder) {
    for (const entry of await readdir(join(root, folder), { withFileTypes: true })) {
      assert.ok(!entry.isSymbolicLink(), 'Source symlinks are not supported: ' + folder + '/' + entry.name);
      const path = folder ? folder + '/' + entry.name : entry.name;
      if (entry.isDirectory()) await walk(path); else if (entry.isFile()) files.push(path);
    }
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && /\.(mjs|js|json|html|css|md)$/.test(entry.name)) files.push(entry.name);
  }
  for (const folder of ['data', 'scripts', 'tests', 'docs', 'ai-policy']) if (await exists(join(root, folder))) {
    assert.ok(!(await lstat(join(root, folder))).isSymbolicLink(), 'Source directory symlinks are not supported: ' + folder);
    await walk(folder);
  }
  return files.sort();
}

export async function fingerprint(root) {
  const hashes = {};
  for (const path of await sourceFiles(root)) hashes[path] = sha(await readFile(join(root, path)));
  return { hashes, hash: sha(JSON.stringify(hashes)) };
}

export async function snapshot(root, destination) {
  assert.ok(!await exists(destination), 'Snapshots are immutable; choose a fresh destination');
  const before = await fingerprint(root);
  for (const path of Object.keys(before.hashes)) {
    const bytes = await readFile(join(root, path));
    assert.equal(sha(bytes), before.hashes[path], 'Source changed during snapshot: ' + path);
    await mkdir(dirname(join(destination, path)), { recursive: true });
    await writeFile(join(destination, path), bytes, { flag: 'wx' });
  }
  assert.equal((await fingerprint(root)).hash, before.hash, 'Source changed during snapshot');
  assert.equal((await fingerprint(destination)).hash, before.hash, 'Snapshot copy mismatch');
  return { root: resolve(destination), ...before };
}

export async function verifySnapshot(record) {
  assert.equal((await fingerprint(record.root)).hash, record.hash, 'Frozen source or judge changed: ' + record.root);
}

export function changes(before, after) {
  return [...new Set([...Object.keys(before.hashes), ...Object.keys(after.hashes)])].sort()
    .filter(path => before.hashes[path] !== after.hashes[path]);
}

export function assertPolicyChanges(before, after, allowed = editable) {
  const paths = changes(before, after);
  assert.ok(paths.length, 'No candidate changes');
  for (const path of paths) assert.ok(allowed(path), 'Protected game rule, judge, test or file changed: ' + path);
  return paths;
}

async function fileHash(root, path) {
  const file = inside(root, join(root, path));
  if (!await exists(file)) return null;
  assert.ok(!(await lstat(file)).isSymbolicLink(), 'Refuse to replace source symlinks');
  return sha(await readFile(file));
}

// Only compare-and-swap the candidate's explicit changes. Never reset, stash,
// clean, checkout, or commit the user's other changes.
export async function promoteFiles({ workspace, baseline, candidate, journalPath, beforeWrite = null, allowed = editable }) {
  await verifySnapshot(baseline); await verifySnapshot(candidate);
  assert.equal((await fingerprint(workspace)).hash, baseline.hash, 'Workspace has changed; promotion stays pending');
  const paths = assertPolicyChanges(baseline, candidate, allowed), journal = {
    status: 'applying', workspace: resolve(workspace), baseline, candidate, paths, applied: [], startedAt: new Date().toISOString(),
  };
  assert.ok(!await exists(journalPath), 'Existing adoption journal must be recovered first');
  await writeJSON(journalPath, journal);
  try {
    for (const path of paths) {
      await beforeWrite?.(path);
      assert.equal(await fileHash(workspace, path), baseline.hashes[path] ?? null, 'Concurrent change: ' + path);
      const file = inside(workspace, join(workspace, path));
      if (Object.hasOwn(candidate.hashes, path)) await atomic(file, await readFile(join(candidate.root, path)));
      else await unlink(file);
      journal.applied.push(path); await writeJSON(journalPath, journal);
    }
    assert.equal((await fingerprint(workspace)).hash, candidate.hash, 'Concurrent change during adoption');
    journal.status = 'adopted'; journal.completedAt = new Date().toISOString(); await writeJSON(journalPath, journal);
    return journal;
  } catch (error) {
    journal.status = 'interrupted'; journal.error = error.message; await writeJSON(journalPath, journal);
    await recoverPromotion(journalPath); throw error;
  }
}

export async function recoverPromotion(journalPath) {
  const journal = await readJSON(journalPath);
  if (['adopted', 'rolled-back'].includes(journal.status)) return journal;
  await verifySnapshot(journal.baseline); await verifySnapshot(journal.candidate);
  const conflicts = [];
  // Inspect every planned path: a process may die between replacement and the
  // journal update. Preserve anything no longer matching either snapshot.
  for (const path of [...journal.paths].reverse()) {
    const current = await fileHash(journal.workspace, path), old = journal.baseline.hashes[path] ?? null, next = journal.candidate.hashes[path] ?? null;
    if (current === old) continue;
    if (current !== next) { conflicts.push(path); continue; }
    const file = inside(journal.workspace, join(journal.workspace, path));
    if (old === null) await unlink(file); else await atomic(file, await readFile(join(journal.baseline.root, path)));
  }
  journal.status = conflicts.length ? 'recovery-conflict' : 'rolled-back'; journal.conflicts = conflicts;
  await writeJSON(journalPath, journal); return journal;
}
