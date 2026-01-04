import { ItemDef } from '../types';

export const itemDefs: Record<string, ItemDef> = {
  // === CAPABILITY UNLOCK ITEMS (4 required) ===

  vanguardHorn: {
    id: 'vanguardHorn',
    name: 'Vanguard Horn',
    rarity: 'epic',
    icon: '📯',
    description: 'EFFECT: Spawns a Guard unit every 8 seconds (adds new emitter)',
    modifiers: [{
      affectsEventTypes: [],
      operation: 'addEmitter',
      emitterDef: {
        id: 'horn_spawn_guard',
        everySec: 8.0,
        targeting: 'self',
        produces: [{
          eventType: 'spawnUnit',
          params: { unitDefId: 'guard' }
        }],
        params: { unitDefId: 'guard' }
      }
    }]
  },

  runestoneOfSentries: {
    id: 'runestoneOfSentries',
    name: 'Runestone of Sentries',
    rarity: 'rare',
    icon: '🔮',
    description: 'EFFECT: Fires Arc Bolt projectiles at enemies every 2 sec (12 damage, 180 range)',
    modifiers: [{
      affectsEventTypes: [],
      operation: 'addEmitter',
      emitterDef: {
        id: 'runestone_arc_bolt',
        everySec: 2.0,
        targeting: 'nearestEnemy',
        produces: [{
          eventType: 'projectile',
          params: { damage: 12, speed: 350 }
        }],
        params: {
          radius: 180,
          projectileSpeed: 350,
          projectileDamage: 12
        }
      }
    }]
  },

  sanctuaryIdol: {
    id: 'sanctuaryIdol',
    name: 'Sanctuary Idol',
    rarity: 'rare',
    icon: '🕯️',
    description: 'EFFECT: Heals lowest HP ally every 3 sec (+15 HP, 120 range)',
    modifiers: [{
      affectsEventTypes: [],
      operation: 'addEmitter',
      emitterDef: {
        id: 'sanctuary_heal_pulse',
        everySec: 3.0,
        targeting: 'lowestHpAlly',
        produces: [{
          eventType: 'heal',
          params: { heal: 15 }
        }],
        params: {
          radius: 120,
          heal: 15
        }
      }
    }]
  },

  dreadSigil: {
    id: 'dreadSigil',
    name: 'Dread Sigil',
    rarity: 'epic',
    icon: '💀',
    description: 'EFFECT: Slows all nearby enemies every 2 sec (50% slow for 3 sec, 100 range)',
    modifiers: [{
      affectsEventTypes: [],
      operation: 'addEmitter',
      emitterDef: {
        id: 'dread_curse_aura',
        everySec: 2.0,
        targeting: 'aroundSelf',
        produces: [{
          eventType: 'applyStatus',
          params: { statusId: 'slow', duration: 3, potency: 0.5 }
        }],
        params: {
          radius: 100,
          statusId: 'slow',
          durationSec: 3,
          potency: 0.5
        }
      }
    }]
  },

  // === UNIVERSAL MODIFIER ITEMS (6+ required) ===

  serratedRuby: {
    id: 'serratedRuby',
    name: 'Serrated Ruby',
    rarity: 'common',
    icon: '💎',
    description: 'EFFECT: All damage from this building +8',
    modifiers: [{
      affectsEventTypes: ['damage'],
      operation: 'addFlat',
      value: 8
    }]
  },

  keenTopaz: {
    id: 'keenTopaz',
    name: 'Keen Topaz',
    rarity: 'common',
    icon: '🔶',
    description: 'EFFECT: Critical hit chance +15%',
    modifiers: [{
      affectsEventTypes: ['damage'],
      operation: 'addFlat',
      value: 0.15
    }]
  },

  venomEmerald: {
    id: 'venomEmerald',
    name: 'Venom Emerald',
    rarity: 'uncommon',
    icon: '🟢',
    description: 'EFFECT: All damage applies Poison (10 damage/sec for 4 sec)',
    modifiers: [{
      affectsEventTypes: ['damage'],
      operation: 'addStatusOnHit',
      statusId: 'poison',
      statusDuration: 4,
      procChance: 1.0
    }]
  },

  chillSapphire: {
    id: 'chillSapphire',
    name: 'Chill Sapphire',
    rarity: 'uncommon',
    icon: '🔵',
    description: 'EFFECT: All damage applies Slow (50% slow for 2 sec)',
    modifiers: [{
      affectsEventTypes: ['damage'],
      operation: 'addStatusOnHit',
      statusId: 'slow',
      statusDuration: 2,
      procChance: 1.0
    }]
  },

  wardingObsidian: {
    id: 'wardingObsidian',
    name: 'Warding Obsidian',
    rarity: 'uncommon',
    icon: '⬛',
    description: 'EFFECT: All spawned units gain +30 max HP and Armored tag',
    modifiers: [{
      affectsEventTypes: ['spawnUnit'],
      operation: 'addFlat',
      value: 30
    }, {
      affectsEventTypes: ['spawnUnit'],
      operation: 'addTag',
      newTag: 'armored'
    }]
  },

  chainOpal: {
    id: 'chainOpal',
    name: 'Chain Opal',
    rarity: 'rare',
    icon: '⚪',
    description: 'EFFECT: All damage chains to +1 nearby enemy',
    modifiers: [{
      affectsEventTypes: ['damage'],
      operation: 'chain',
      value: 1
    }]
  },

  cursedSkull: {
    id: 'cursedSkull',
    name: 'Cursed Skull',
    rarity: 'rare',
    icon: '☠️',
    description: 'EFFECT: All damage +50%, but building loses 2 HP/sec',
    modifiers: [{
      affectsEventTypes: ['damage'],
      operation: 'multiply',
      value: 1.5
    }]
  },

  piercingJavelin: {
    id: 'piercingJavelin',
    name: 'Piercing Javelin',
    rarity: 'uncommon',
    icon: '🗡️',
    description: 'EFFECT: All projectiles pierce through +1 enemy',
    modifiers: [{
      affectsEventTypes: ['projectile', 'damage'],
      operation: 'pierce',
      value: 1
    }]
  },

  swiftnessFeather: {
    id: 'swiftnessFeather',
    name: 'Swiftness Feather',
    rarity: 'common',
    icon: '🪶',
    description: 'EFFECT: All spawned units gain +20 movement speed',
    modifiers: [{
      affectsEventTypes: ['spawnUnit'],
      operation: 'addTag',
      newTag: 'swift'
    }]
  },

  blazingCore: {
    id: 'blazingCore',
    name: 'Blazing Core',
    rarity: 'rare',
    icon: '🔥',
    description: 'EFFECT: All damage +25% and converts to Fire damage type',
    modifiers: [{
      affectsEventTypes: ['damage'],
      operation: 'multiply',
      value: 1.25
    }, {
      affectsEventTypes: ['damage'],
      operation: 'convertDamageType',
      value: 0
    }]
  }
};

// Weighted pool for random loot generation
export const lootPool: { defId: string; weight: number }[] = [
  { defId: 'serratedRuby', weight: 30 },
  { defId: 'keenTopaz', weight: 30 },
  { defId: 'swiftnessFeather', weight: 25 },
  { defId: 'venomEmerald', weight: 15 },
  { defId: 'chillSapphire', weight: 15 },
  { defId: 'wardingObsidian', weight: 15 },
  { defId: 'piercingJavelin', weight: 12 },
  { defId: 'chainOpal', weight: 8 },
  { defId: 'cursedSkull', weight: 6 },
  { defId: 'blazingCore', weight: 5 },
  { defId: 'runestoneOfSentries', weight: 4 },
  { defId: 'sanctuaryIdol', weight: 4 },
  { defId: 'dreadSigil', weight: 2 },
  { defId: 'vanguardHorn', weight: 2 }
];
