# Palace character runtime

The 2026 game uses the current submitted-article archive for participation and article links: 14 submitted creators, with CNA still awaiting a submission. Character identity follows each creator's current official profile avatar, except the owner's explicitly selected lantern reference and Mako's official character sheet. The owner is the playable hero, never a duplicate NPC.

## Characters and source fidelity

- 18 four-direction, four-frame motion atlases: one hero, 16 NPC renderables and one black-cat follower. 15 NPC renderables have conversation targets; Tantan's grouped hedgehogs are visual companions only.
- 22 current avatar/reference entities, including Mama's cream companion, Marimo's head-riding cat, Aihan's Shiba and Tantan's three unnamed hedgehogs. Superseded article casts and their unused runtime assets are removed.
- Same-identity existing art retains its original generation source and receives a separate current-avatar review. Newly generated replacements record their actual profile-avatar source. No fallback to an unrelated human is used.
- Public profile/article artwork references and hashes are recorded in `data/creator-characters.json`. The owner's approved replacement uses a SHA256 reference without private attachment identifiers. Runtime JSON contains no local source paths.
- A character requires reviewed identity, reviewed animation, a current reference decision, a ready flag and measured frame metadata. Missing assets do not substitute another person's appearance. Multi-entity groups enter the scene atomically after their images load.
- Takechi's bread mascot uses measured semantic row remapping and a constant source scale so squash-and-hop motion is preserved. Its nonhuman silhouette does not receive invented human limbs.
- NPC dialogue is short original game fiction and is explicitly labeled. Each creator retains the canonical submitted article link. The directory uses the current archive's formal creator display names.

## Interaction

Move with the pad, WASD or arrows. E investigates, C talks to a nearby creator character, and B talks to a monster. Interactive character sprites and names are tappable; dragging the 3D view never initiates a conversation. The menu also provides a keyboard-accessible directory and story journal. Unnamed visual companions do not have independent talk buttons or name tags.

NPCs take small deterministic four-direction strolls inside floor-tested assigned positions. They do not block doors or progression. Reduced motion freezes NPC movement and pose animation; owner-controlled movement remains usable.

The same data drives 2D depth-sorted sprites and 3D depth-tested billboards. Room geometry is native 3D; character art remains directional sprites rather than skeletal 3D models.

## Loading and performance

- Runtime atlases: 1024-pixel WebP copies, quality 88, lossless alpha after deterministic resizing. Full-resolution originals stay outside the published runtime tree.
- All character art: 7,171,642 bytes total. Hero plus black cat: 886,498 bytes.
- Hero loading is required before the scene starts. Nearby characters load lazily, two requests at once.
- At most five nearby NPC renderables, plus hero and follower, are pinned. Decoded character cache: at most eight entries and 32 MiB. This excludes other scenery, GPU textures and alpha-picking buffers.
- Cache failure preserves article access and provides an explicit retry. No automatic retry loop or full-roster preload.

## Verification boundary

Node tests cover complete current identity membership, provenance, source privacy, image hashes and bounds, avatar-policy rejection, group loading, reachable approaches in both movement modes, collision-safe motion, cache budgets, pointer cancellation, tactical battles and ending idempotence. Native Canvas renders check actual source rectangles, scale and placement. Browser/mobile-device and real WebGL playback were not run; native renders are not browser screenshots.

Article collection, door/key progression, six-monster ending eligibility and the existing clear receipt remain separate from creator conversation. Music starts OFF at volume zero and is controlled only from the menu.
