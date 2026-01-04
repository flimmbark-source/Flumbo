import { EnemyDef, UnitRole } from '../types';

export const enemyDefs: Record<string, EnemyDef> = {
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    maxHp: 60,
    speed: 45,
    damage: 8,
    size: 4,
    color: '#4a9c2d',
    lootChance: 0.3
  },

  orc: {
    id: 'orc',
    name: 'Orc',
    maxHp: 120,
    speed: 35,
    damage: 15,
    size: 5,
    color: '#8b4513',
    lootChance: 0.4
  },

  troll: {
    id: 'troll',
    name: 'Troll',
    maxHp: 250,
    speed: 25,
    damage: 25,
    size: 8,
    color: '#654321',
    lootChance: 0.6
  }
};

// Allied unit definitions (RTS style)
export interface UnitDef {
  id: string;
  name: string;
  role: UnitRole;
  maxHp: number;
  speed: number;
  damage: number;
  size: number;
  attackRange: number;
  attackCooldown: number;
  gatherRate?: number;
  gatherCapacity?: number;
  color: string;
}

export const unitDefs: Record<string, UnitDef> = {
  worker: {
    id: 'worker',
    name: 'Worker',
    role: 'worker',
    maxHp: 50,
    speed: 60,
    damage: 3,
    size: 3,
    attackRange: 30,
    attackCooldown: 2.0,
    gatherRate: 10,
    gatherCapacity: 10,
    color: '#ffaa00'
  },

  fighter: {
    id: 'fighter',
    name: 'Fighter',
    role: 'fighter',
    maxHp: 100,
    speed: 55,
    damage: 15,
    size: 3,
    attackRange: 50,
    attackCooldown: 1.2,
    color: '#ff4444'
  },

  healer: {
    id: 'healer',
    name: 'Healer',
    role: 'support',
    maxHp: 70,
    speed: 50,
    damage: 0,
    size: 3,
    attackRange: 120,
    attackCooldown: 2.5,
    color: '#44ff88'
  }
};
