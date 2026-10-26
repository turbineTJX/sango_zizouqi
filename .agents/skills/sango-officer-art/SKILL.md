---
name: sango-officer-art
description: "Generate, review, and integrate reusable officer master artwork for the Sango project, or resume its roster art queue. Use for this project's officer asset production, not unrelated illustrations or game-rule changes."
---

# Sango officer art

Find the project root containing `officer-art-scenes.mjs` and `scripts/officer-art-batch.mjs`. Read `AGENTS.md`, `docs/武将多场景美术流程.md`, and the configured asset workspace's `officers/art-direction.json`. Those files maintain the actual roster, sizes and workflow.

## Three masters, many views

Produce only `neutral`, `work`, and `command`: standing, occupational work, and command poses. All new masters are transparent full figures with clear faces, complete headwear and both feet. Preserve a fixed identity, costume, restrained painterly style, neutral closed mouth and natural hands. The UI crops faces/half bodies and combines shared environments; never generate eleven independent illustrations for eleven UI uses. Crops are normalized `[x,y,width,height]` metadata in `crops.face/half/full`, not extra PNGs.

Use the exact officer's original local Three Kingdoms XI portrait as the face reference for the standing master. Run `node scripts/officer-art-face-references.mjs --officers <ids>` and inspect the actual paths before generation. Extract face length/width, cheekbones, jaw, eye spacing, nose and facial hair. An approved project identity may be a second reference for costume and style. Missing/shared originals require a distinct reviewed face, never another officer's identity. Subsequent work/command poses reference the approved standing master returned by the refreshed task.

Read the exact stable ID's identity and biography before design. Record `profiles[id].role` with `primary`, `secondary`, `evidence`, and `bearing`; personal prop exceptions may be recorded. Art roles are martial, commander, strategist, civil, ruler, specialist. Separate history and novel evidence. Never infer them from troop type, stats, gender or faction. Martial officers retain military bearing during work; civil officers remain civil in military views. Calm does not mean a universal scholar. Personal pose overrides belong in `sourceActing[id]`.

## Resume and generate

Users can resume with “继续按三母图工作流生成下一批武将” or invoke `$sango-officer-art`. Resolve progress from `officers/batches/index.json`, the active batch, receipts and the public manifest in the configured asset workspace; never depend on chat memory or a frozen officer/count copied into this skill. The completed batch's real prompt/result records can serve as examples, but each next officer needs their own face, biography and pose direction.

Run `node scripts/officer-art-batch.mjs status`, then `plan --limit 3`. Read its real task file. It resumes the active batch, skips completed/reused masters, and preserves old eleven-scene jobs/candidates under `previousFormat`. Old approved originals can satisfy masters by verified URL aliases; keep their real format, SHA and generation provenance. Do not regenerate them merely to meet a new count.

Address explicit role rework before new production. Review source fidelity before face, anatomy and framing. Use the built-in imagegen tool, one call per missing master, with the task prompt and real transparency requirement. Inspect every local input first. For standing, pass this person's original face plus their approved project identity when available. For work/command, use the refreshed `referenceFile`, which points at their standing master. Do not switch to API/CLI unless the user explicitly requests that fallback.

Save an actual result JSON with `officerId`, `scene`, saved PNG `file`, full actual `prompt`, task `referenceSha256`, and `referenceInputs` entries (file, SHA, role). Record optional crops. The built-in result may contain a data URL: obtain the saved path from `output_hint`; never print base64 or use it as a filename.

```text
node scripts/officer-art-batch.mjs record <batch-id> <result.json>
node scripts/render-officer-art-batch.mjs <batch-id> --portraits
node scripts/officer-art-batch.mjs accept <batch-id> --reviewed --scenes neutral
node scripts/officer-art-batch.mjs plan --limit 3
```

`--portraits` reviews the standing masters. Compare the original face, approved identity and standing result, including nearby officers with similar faces. Inspect headwear, visible hands, feet and real alpha. Review face/half/full crops in the game. Codex may complete visual QA and accept an authorized local batch without an extra approval gate.

After standing acceptance, refresh the batch before generating work/command. Their `referenceSha256` is the standing master SHA; `identitySha256` separately identifies the character identity. A changed standing master invalidates old dependent candidates. Never rewrite provenance to relabel an old image as newly generated. For replacements use `--replace`, preserve earlier files/receipts and the actual input chain. If two targeted revisions leave a defect, keep the unresolved candidate explicit and continue independent work.

```text
node scripts/officer-art-batch.mjs accept <batch-id> --reviewed
node scripts/officer-art-batch.mjs finish <batch-id>
npm run test:officer-art
npm run test:asset-pack
npm run art:check
npm run art:verify-officers
npm run docs:check
```

Finish requires the three masters per officer. New PNGs use generated/v4; legacy originals stay in place. The public manifest includes reusable source URLs and an existing high-quality thumbnail where needed; unused old scene art stays local and is excluded from release. Production records remain outside release. Verify desktop/mobile, shared backgrounds, same-URL scene changes, failed-pose fallback and read-only saves.

Report actual new PNGs, reused source targets, remaining work, workspace paths and prompt/result records separately. Do not count crops as generated art or mark a partial batch finished. Full-roster continuation is authorized only by the user's scope. When requested, use the existing thread heartbeat, persist its ID, stay quiet while unchanged and stop it only after all targets/rework complete. Preserve work and report actual tool/limit blockers without a silent API fallback.
