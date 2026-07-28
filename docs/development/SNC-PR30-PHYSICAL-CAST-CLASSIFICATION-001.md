# PR #30 physical cast scale review

Status: query-only review data. No character manifest, generated runtime asset,
normal Gallery placement, renderer, camera, block, collision, or depth behavior
is changed by this card.

The Samsung-approved standing class is `0.78`. It is applied in the review only
to ordinary, single standing adults. The seated asset remains locked at `0.68`
with `groundContactSourceY: 182`. Scenes that contain more than one subject or
vehicle remain deliberately unresolved; their review instance retains the
canonical `0.96` until a separate physical-height decision is made.

| Asset | Artwork classification | Query-only review height | Canonical height | Basis |
| --- | --- | ---: | ---: | --- |
| `npc_volunteer_elder_cane_001` | standing adult | 0.78 | 0.96 | One standing adult; cane is an accessory. |
| `npc_volunteer_tote_001` | standing adult | 0.78 | 0.96 | One standing adult; tote is an accessory. |
| `npc_volunteer_miguel_001` | standing adult | 0.78 | 0.96 | One standing adult. |
| `npc_household_parent_child_001` | composite unresolved | 0.96 | 0.96 | Parent holding child; no single-body height can be inferred. |
| `npc_civilian_backpack_youth_001` | youth unresolved | 0.96 | 0.96 | The artwork and asset ID identify a youth, not an ordinary adult. |
| `npc_civilian_beanie_messenger_001` | standing adult | 0.78 | 0.96 | One standing adult; bag is an accessory. |
| `npc_civilian_grocery_carrier_001` | standing adult | 0.78 | 0.96 | One standing adult; bags are accessories. |
| `npc_household_dog_walker_001` | composite unresolved | 0.96 | 0.96 | Person plus dog. |
| `npc_unhoused_dog_companion_001` | composite unresolved | 0.96 | 0.96 | Person plus dog. |
| `npc_unhoused_bicycle_001` | composite unresolved | 0.96 | 0.96 | Rider plus bicycle and cargo. |
| `npc_unhoused_cane_001` | standing adult | 0.78 | 0.96 | One standing adult; cane and pack are accessories. |
| `npc_unhoused_work_jacket_001` | standing adult, locked | 0.78 | 0.78 | Samsung-approved authority. |
| `npc_unhoused_dyed_hair_001` | standing adult | 0.78 | 0.96 | One standing adult; pack is an accessory. |
| `npc_unhoused_blanket_wrap_001` | standing adult | 0.78 | 0.96 | One standing adult; blanket is clothing. |
| `npc_unhoused_slumped_001` | seated, locked | 0.68 | 0.68 | Samsung-approved height and contact row 182. |
| `npc_unhoused_cart_001` | composite unresolved | 0.96 | 0.96 | Person plus shopping cart and cargo. |

## Review routes

- Full cast, all sixteen at the same forward camera depth:
  `?heightfield=1&hfcastreview=1`
- Equal-depth inspection pages, four assets each, for readable close review:
  `?heightfield=1&hfcastreview=1&hfcastpage=1` through
  `?heightfield=1&hfcastreview=1&hfcastpage=4`
- Can-only comparison, left to right: `0.36`, `0.40`, `0.44`, with a `0.50`
  half-block reference:
  `?heightfield=1&hfcanreview=1`

The can values are review instances only. Canonical can `worldHeight` remains
`0.26` until Samsung selects a value.
