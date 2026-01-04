import { BuildingDef } from '../types';

export const buildingDefs: Record<string, BuildingDef> = {
  townCore: {
    id: 'townCore',
    name: 'Town Core',
    icon: '🏛️',
    maxHp: 1000,
    radius: 40,
    baseEmitters: [],
    description: 'The heart of your town. Protect it at all costs!'
  },

  arrowTower: {
    id: 'arrowTower',
    name: 'Arrow Tower',
    icon: '🗼',
    maxHp: 200,
    radius: 30,
    baseEmitters: [{
      id: 'tower_shoot',
      everySec: 1.0,
      targeting: 'nearestEnemy',
      produces: [{
        eventType: 'projectile',
        params: { damage: 15, speed: 300 }
      }],
      params: {
        radius: 200,
        projectileSpeed: 300,
        projectileDamage: 15
      }
    }],
    description: 'Shoots arrows at nearby enemies'
  },

  healerTotem: {
    id: 'healerTotem',
    name: 'Healer Totem',
    icon: '🗿',
    maxHp: 150,
    radius: 25,
    baseEmitters: [{
      id: 'healer_pulse',
      everySec: 2.0,
      targeting: 'lowestHpAlly',
      produces: [{
        eventType: 'heal',
        params: { heal: 20 }
      }],
      params: {
        radius: 150,
        heal: 20
      }
    }],
    description: 'Heals nearby friendly structures'
  },

  barracks: {
    id: 'barracks',
    name: 'Barracks',
    icon: '🏰',
    maxHp: 250,
    radius: 35,
    baseEmitters: [{
      id: 'spawn_guard',
      everySec: 10.0,
      targeting: 'self',
      produces: [{
        eventType: 'spawnUnit',
        params: { unitDefId: 'guard' }
      }],
      params: {
        unitDefId: 'guard',
        count: 1
      }
    }],
    description: 'Spawns guard units to defend your town'
  }
};
