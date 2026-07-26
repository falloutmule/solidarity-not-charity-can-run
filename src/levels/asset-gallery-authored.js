/* Authoritative placement references for the query-gated SNC runtime asset gallery. */
(function(root){
  'use strict';
  const level = {
    schema: 'snc-asset-gallery-level-v1',
    id: 'asset-gallery-v1',
    width: 40,
    height: 24,
    playerStart: { x: 4.5, y: 21.5, angle: -Math.PI / 2 },
    characters: [
      { id: 'gallery-npc-volunteer-elder-cane-001', assetId: 'npc_volunteer_elder_cane_001', zone: 'volunteer', x: 4.5, y: 4.5 },
      { id: 'gallery-npc-volunteer-tote-001', assetId: 'npc_volunteer_tote_001', zone: 'volunteer', x: 9.5, y: 4.5 },
      { id: 'gallery-npc-volunteer-miguel-001', assetId: 'npc_volunteer_miguel_001', zone: 'volunteer', x: 14.5, y: 4.5 },
      { id: 'gallery-npc-civilian-backpack-youth-001', assetId: 'npc_civilian_backpack_youth_001', zone: 'civilian', x: 4.5, y: 9.5 },
      { id: 'gallery-npc-civilian-beanie-messenger-001', assetId: 'npc_civilian_beanie_messenger_001', zone: 'civilian', x: 9.5, y: 9.5 },
      { id: 'gallery-npc-civilian-grocery-carrier-001', assetId: 'npc_civilian_grocery_carrier_001', zone: 'civilian', x: 14.5, y: 9.5 },
      { id: 'gallery-npc-household-parent-child-001', assetId: 'npc_household_parent_child_001', zone: 'household', x: 4.5, y: 14.5 },
      { id: 'gallery-npc-household-dog-walker-001', assetId: 'npc_household_dog_walker_001', zone: 'household', x: 12.0, y: 14.5 },
      { id: 'gallery-npc-unhoused-dog-companion-001', assetId: 'npc_unhoused_dog_companion_001', zone: 'unhoused', x: 21.0, y: 4.5 },
      { id: 'gallery-npc-unhoused-bicycle-001', assetId: 'npc_unhoused_bicycle_001', zone: 'unhoused', x: 28.0, y: 4.5 },
      { id: 'gallery-npc-unhoused-cane-001', assetId: 'npc_unhoused_cane_001', zone: 'unhoused', x: 34.0, y: 4.5 },
      { id: 'gallery-npc-unhoused-work-jacket-001', assetId: 'npc_unhoused_work_jacket_001', zone: 'unhoused', x: 21.0, y: 10.5 },
      { id: 'gallery-npc-unhoused-dyed-hair-001', assetId: 'npc_unhoused_dyed_hair_001', zone: 'unhoused', x: 27.0, y: 10.5 },
      { id: 'gallery-npc-unhoused-blanket-wrap-001', assetId: 'npc_unhoused_blanket_wrap_001', zone: 'unhoused', x: 33.0, y: 10.5 },
      { id: 'gallery-npc-unhoused-slumped-001', assetId: 'npc_unhoused_slumped_001', zone: 'unhoused', x: 21.0, y: 16.5 },
      { id: 'gallery-npc-unhoused-cart-001', assetId: 'npc_unhoused_cart_001', zone: 'unhoused', x: 29.0, y: 16.5 }
    ],
    props: [
      { id: 'gallery-prop-bench-001', kind: 'bench', x: 5.5, y: 16.5 },
      { id: 'gallery-prop-mailbox-001', kind: 'mailbox', x: 10.5, y: 16.5 },
      { id: 'gallery-prop-utility-box-001', kind: 'utility_box', x: 15.5, y: 16.5 }
    ],
    pickups: [{ id: 'gallery-pickup-can-001', x: 20.5, y: 16.5, amt: 1 }],
    exit: { id: 'gallery-marker-portal-001', x: 24.5, y: 16.5, active: true },
    buildings: [{
      id: 'gallery-building-custom-next-001', assetId: 'custom_next_001', x: 29, y: 19,
      rotation: 0, widthCells: 6, depthCells: 3, front: 'south'
    }],
    deferredTestBays: [{
      id: 'low-block-height-bays',
      status: 'deferred',
      dependency: 'low-block raycaster spike acceptance',
      heights: [0.4, 0.5, 0.6]
    }]
  };
  root.SNC_ASSET_GALLERY_LEVEL = Object.freeze(level);
})(globalThis);
