import { BuildingDef } from '../types';

export const buildingDefs: Record<string, BuildingDef> = {
  townHall: {
    id: 'townHall',
    name: 'Town Hall',
    icon: '🏛️',
    maxHp: 2000,
    radius: 30,
    category: 'core',
    cost: {},
    baseEmitters: [{
      id: 'spawn_worker',
      everySec: 12.0,
      targeting: 'self',
      produces: [{
        eventType: 'spawnUnit',
        params: { unitDefId: 'worker' }
      }],
      params: {
        unitDefId: 'worker',
        count: 1
      }
    }],
    description: 'Central building. Produces workers automatically.'
  },

  barracks: {
    id: 'barracks',
    name: 'Barracks',
    icon: '⚔️',
    maxHp: 800,
    radius: 25,
    category: 'production',
    cost: { wood: 150, ore: 50 },
    baseEmitters: [{
      id: 'spawn_fighter',
      everySec: 8.0,
      targeting: 'self',
      produces: [{
        eventType: 'spawnUnit',
        params: { unitDefId: 'fighter' }
      }],
      params: {
        unitDefId: 'fighter',
        count: 1
      }
    }],
    description: 'Trains fighter units to defend your base'
  },

  sanctum: {
    id: 'sanctum',
    name: 'Sanctum',
    icon: '✨',
    maxHp: 600,
    radius: 22,
    category: 'production',
    cost: { wood: 120, gold: 80 },
    baseEmitters: [{
      id: 'spawn_healer',
      everySec: 10.0,
      targeting: 'self',
      produces: [{
        eventType: 'spawnUnit',
        params: { unitDefId: 'healer' }
      }],
      params: {
        unitDefId: 'healer',
        count: 1
      }
    }],
    description: 'Trains support units that heal allies'
  },

  arrowTower: {
    id: 'arrowTower',
    name: 'Arrow Tower',
    icon: '🗼',
    maxHp: 500,
    radius: 20,
    category: 'military',
    cost: { wood: 80, ore: 40 },
    baseEmitters: [{
      id: 'tower_shoot',
      everySec: 0.8,
      targeting: 'nearestEnemy',
      produces: [{
        eventType: 'projectile',
        params: { damage: 20, speed: 400 }
      }],
      params: {
        radius: 250,
        projectileSpeed: 400,
        projectileDamage: 20
      }
    }],
    description: 'Defensive tower that auto-attacks enemies'
  },

  storageHut: {
    id: 'storageHut',
    name: 'Storage Hut',
    icon: '📦',
    maxHp: 400,
    radius: 16,
    category: 'resource',
    cost: { wood: 60 },
    baseEmitters: [],
    description: 'Remote deposit point for gathering workers'
  },

  techLab: {
    id: 'techLab',
    name: 'Tech Lab',
    icon: '🔬',
    maxHp: 600,
    radius: 22,
    category: 'tech',
    cost: { wood: 100, ore: 80, gold: 50 },
    baseEmitters: [],
    description: 'Research upgrades for units and buildings'
  },

  forge: {
    id: 'forge',
    name: 'Forge',
    icon: '🔨',
    maxHp: 700,
    radius: 22,
    category: 'tech',
    cost: { wood: 120, ore: 100 },
    baseEmitters: [],
    description: 'Improves item quality and socketing bonuses'
  }
};

// Helper to get buildings by category
export function getBuildingsByCategory(category: string): BuildingDef[] {
  return Object.values(buildingDefs).filter(def => def.category === category);
}
