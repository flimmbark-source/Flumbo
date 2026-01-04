import { EnemyDef } from '../types';

export const enemyDefs: Record<string, EnemyDef> = {
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    maxHp: 50,
    speed: 40,
    damage: 5,
    size: 12,
    color: '#4a9c2d',
    lootChance: 0.3
  },

  orc: {
    id: 'orc',
    name: 'Orc',
    maxHp: 100,
    speed: 30,
    damage: 10,
    size: 16,
    color: '#8b4513',
    lootChance: 0.4
  },

  troll: {
    id: 'troll',
    name: 'Troll',
    maxHp: 200,
    speed: 20,
    damage: 20,
    size: 24,
    color: '#654321',
    lootChance: 0.6
  }
};

export const guardUnitDef = {
  id: 'guard',
  name: 'Guard',
  maxHp: 60,
  speed: 50,
  damage: 8,
  size: 10,
  attackRange: 50,
  attackCooldown: 1.5
};
