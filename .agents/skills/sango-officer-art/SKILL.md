---
name: sango-officer-art
description: "Generate, review, and integrate original multi-scene officer artwork for the Sango project, or resume its full-roster art queue. Use for this project's officer asset production, not unrelated illustrations or game-rule changes."
---

# Sango officer art

Find the actual project root containing `officer-art-scenes.mjs` and `scripts/officer-art-batch.mjs`; the chat may start one directory above it. From that root, read `AGENTS.md`, `docs/武将多场景美术流程.md`, and `assets/officers/art-direction.json`. Treat those project files as the maintained specification; do not freeze a roster or pixel size copied from an earlier chat.

The established direction is original semi-realistic Three Kingdoms officer art with **neutral, calm expressions and small natural actions**. Relaxed brows, closed lips, comfortable hands, normal head/shoulder proportions. Scene variety comes from framing, seated/standing posture, gaze and task props. Do not force expression diversity through shouting, grimacing, exaggerated smiles, wide eyes, thrusting palms, beard/forehead clutching, swings or twisted poses. Preserve square headshots, transparent full-body standees, varied half bodies and landscape scenes; never manufacture variants by cropping one image.

## Classify the officer before designing any scene

Read the exact stable ID's catalogue identity and biography first. In `profiles[id].role`, record `primary`, `secondary` (an array), `evidence` (the identity/biography basis), and `bearing` (this person's role-specific visual direction). Separate historical and novel-only descriptions. Use these art roles, with secondary roles for mixed identities:

| Role | Visual direction |
| --- | --- |
| `martial` 武勇将领 | Military posture, equipment, wrist guards and practical field tasks; calm alertness rather than roaring. |
| `commander` 战场统帅 | Deployment, inspections and organizing troops; cultivated bearing can still be military. |
| `strategist` 谋士军师 | Planning, observation and military advice; not a frontline fighter or a universal feather-fan template. |
| `civil` 文臣学士 | Governance, scholarship, records or diplomacy according to the actual office; no automatic combat armor. |
| `ruler` 君主领袖 | Receiving, governing, inspecting or directing with the person's leadership bearing. |
| `specialist` 特殊职能人物 | Explicitly describe the actual function and its relevant tools; do not use this category to skip research. |

**Never infer art role from the catalogue's troop `type`, `intellect > force`, stat rankings, gender or faction.** If the role is unresolved, leave it unclassified and read the identity evidence before generation. The production tools return `blocked-role` with no prompt until classification exists. Art roles do not change game troop types or rules.

Neutral expression does not mean scholarly demeanor. Design all eleven poses after classification, keeping that identity across domestic work, diplomacy, reports and battle. A martial officer can check supplies for domestic work, receive a visitor with relaxed military posture, and report orally at a camp gate; do not default those scenes to brush-writing, folded scholar sleeves or two-hand book presentation. A civil officer at a practice ground can handle rosters or supply records without becoming a fighter. Books and writing are not forbidden for warriors when individually justified: Guan Yu's reading has a biography basis, and mixed rulers/commanders may handle documents. Record such exceptions in `role.propExceptions`; do not let one legitimate prop dominate the whole set.

Ahui Nan (`person-1`) is `martial` with secondary `commander`: the novel entry describes Meng Huo's subordinate, third-cave marshal and field defense. Preserve ordinary human design, armor and practical military bearing; neither turn him into a scholar nor add ethnic caricatures. Zhou Yu is a cultivated commander; Wei Zhao, Yi Ji and Yin Mo remain civil officers despite combat troop fields. Role classification precedes face design, costume, props and acting.

## Resume production

First inspect `art-direction.json`'s `roleReviews`. Address explicit `needs-rework` scenes before advancing the roster, even if an old batch is complete. Preserve the reviewed identity unless its face is actually wrong. Generate each replacement independently from that person's approved identity and the corrected role-bound prompt, save the real result JSON and prompt, then visually review it. Archive the previous PNG and receipt outside release contents before `officer-art.mjs import <id> <scene> <PNG> --approve --replace --prompt-file <actual-prompt>`. Only then mark that scene's review complete and record the replacement SHA. Do not overwrite old reference hashes or claim a changed instruction has already changed an image; leave unresolved scenes explicit.

Run `node scripts/officer-art-batch.mjs status`, then `plan --limit 3`. `plan` resumes the active batch before creating another and skips completed current-format images. Read the returned batch JSON for actual tasks and dependencies. If the user specified a scope, honor it; continuous full-roster production is authorized only when the user requested it.

For a new officer, run `node scripts/officer-art-face-references.mjs --officers <ids>` or read the headshot task's `sourceFaceReference`. It resolves the existing local portrait by exact stable ID, with the real file path and hash; it never borrows a similarly named officer. Inspect that image first. Extract face length/width, forehead, cheekbones, jaw/chin, eye spacing/shape, brow shape, nose bridge/tip, mouth and facial hair into an original identity card, then add eleven scene-specific natural poses to `art-direction.json`. Physical traits and visual age are art choices, not facts inferred from stats. Keep facial structure visibly distinct; different hats, colors and beards alone do not fix a shared template face. Compare the new batch's headshots and similar approved faces. If this person's local reference is missing, design a separate face explicitly and review its differences; do not silently substitute another person's image. Read the catalogue for identity and role, and consult existing code before adding or remapping an actual UI scene.

Generate and visually inspect the independent headshot first, using this person's existing portrait for facial geometry when available. If `sourceFaceReference.sharedWith` is nonempty, the old resource itself shares a face: use it only as a starting point and design visibly different facial proportions for those officers, not just different costumes. Repaint in our style with neutral natural expression; do not inherit roaring, scowls, exaggerated gestures or the old background/costume. Accepting it establishes this officer's approved identity reference. Refresh the batch with `plan`; the remaining tasks now include the reference path and hash. Inspect each local reference with `view_image` before using it, and use only that officer's own approved identity for subsequent scenes. If identity changes, the batch marks old dependent candidates `stale-identity`; regenerate them with the new face instead of approving or relabeling their old reference hashes.

Use the built-in imagegen tool, one call per asset, with the task's full prompt, aspect and transparency requirement. For a new identity with a source portrait, pass that exact person's reference; omit reference fields only when no reference is available. For later scenes, pass the approved local identity path. Persist actual reference paths/hashes and prompts, with local source records outside the release. Do not switch to an API/CLI generator merely because this is a batch. The `image_url` result may be a data URL: obtain the saved PNG path from `output_hint`, never treat base64 as a filename or print it.

Persist a small result JSON containing `officerId`, `scene`, `file`, the **actual** `prompt`, and the task's `referenceSha256`. Then run:

```text
node scripts/officer-art-batch.mjs record <batch-id> <result.json>
node scripts/render-officer-art-batch.mjs <batch-id> --portraits
node scripts/officer-art-batch.mjs accept <batch-id> --reviewed --scenes portrait
```

Record subsequent images the same way, then render the complete batch. Inspect every officer's board; zoom into suspect faces, hands and weapon joints. First verify that costume, posture, tools and all eleven activities fit the recorded primary/secondary role. A calm face does not rescue the wrong occupational bearing. Then confirm neutral natural expression, identity consistency, distinct task composition, full headwear/feet for standees and genuine alpha. Program checks validate file hashes, frame proportions and transparency, **not** role fidelity or expression quality. Make targeted revisions for concrete defects; after two revisions retain unresolved candidates for review and continue independent tasks instead of looping indefinitely.

`record` only creates candidates. `accept --reviewed` means the operator completed visual QA; for an authorized local batch, Codex can perform that QA and accept the result without adding a user approval gate. Accept mutations sequentially, optionally by officer subset. Group imports in one process when practical. Do not overwrite assets outside the user's authorized production or correction scope.

If a newly accepted headshot in the current batch needs a framing correction, generate the corrected headshot from its existing identity reference, inspect it, and use the original `officer-art.mjs import ... --approve --replace --prompt-file ...` command. Keep the unchanged identity reference and its actual hash; do not rewrite generation provenance or invalidate all other scenes just to add headroom. Check tall crowns at full size, with visible background above the highest point. Identity changes require reviewing all dependent scenes.

```text
node scripts/officer-art-batch.mjs accept <batch-id> --reviewed
node scripts/officer-art-batch.mjs finish <batch-id>
npm run test:officer-art
npm run art:verify-officers
npm run docs:check
```

`finish` requires all eleven assets per officer, refreshes the global queue and gallery, and releases the active batch. Verify real images in desktop/mobile UI, update the offline cache for published batches, and check release assets when building a release. Keep production records and candidates outside release contents. Report completed and remaining **actual image counts**, the gallery, workspace files and actual prompt records; do not count placeholders or planned prompts as generated art.

## Continuous queue

When continuous follow-up is requested, use a thread heartbeat with the Codex automation tool and persist its ID in the project production record. Each run resumes file-backed progress, completes a manageable set, and leaves remaining jobs explicit. Do not create a separate user task per batch. Avoid redundant image generation, batch notifications and duplicate automations. Notify on full completion, a meaningful failure or necessary user input. If built-in generation fails or reaches a limit, preserve results and the exact remaining tasks; report the real blocker and do not silently fall back to an API. Stop the recurring follow-up once the full current-format roster is complete and all explicit role rework is resolved.
