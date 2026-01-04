// Core type definitions for the town defense game

export type Phase = 'DAY' | 'NIGHT';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface Vec2 {
  x: number;
  y: number;
}

// Event types for universal effect system
export interface DamageEvent {
  type: 'damage';
  amount: number;
  damageType: string;
  sourceEntityId: string;
  targetEntityId: string;
  tags: string[];
  critChance?: number;
  critMult?: number;
  pierce?: number;
  chain?: number;
  knockback?: number;
}

export interface HealEvent {
  type: 'heal';
  amount: number;
  sourceEntityId: string;
  targetEntityId: string;
  tags: string[];
  cleanseChance?: number;
  shieldOverheal?: number;
}

export interface SpawnUnitEvent {
  type: 'spawnUnit';
  unitDefId: string;
  stats: Record<string, number>;
  tags: string[];
  position?: Vec2;
  sourceEntityId: string;
}

export interface ProjectileEvent {
  type: 'projectile';
  projectileDefId: string;
  stats: Record<string, number>;
  tags: string[];
  sourceEntityId: string;
  targetEntityId?: string;
  direction?: Vec2;
}

export interface AuraEvent {
  type: 'aura';
  radius: number;
  tickSec: number;
  effect: string;
  tags: string[];
  sourceEntityId: string;
}

export interface ApplyStatusEvent {
  type: 'applyStatus';
  statusId: string;
  durationSec: number;
  stacks: number;
  potency: number;
  tags: string[];
  sourceEntityId: string;
  targetEntityId: string;
}

export type GameEvent = DamageEvent | HealEvent | SpawnUnitEvent | ProjectileEvent | AuraEvent | ApplyStatusEvent;

// Emitter system for capability unlocks
export interface EmitterDef {
  id: string;
  everySec: number;
  produces: EventTemplate[];
  targeting: 'nearestEnemy' | 'lowestHpAlly' | 'aroundSelf' | 'towardCore' | 'self';
  params: {
    radius?: number;
    count?: number;
    damage?: number;
    heal?: number;
    unitDefId?: string;
    statusId?: string;
    durationSec?: number;
    potency?: number;
    projectileSpeed?: number;
    projectileDamage?: number;
  };
}

export interface EventTemplate {
  eventType: 'damage' | 'heal' | 'spawnUnit' | 'projectile' | 'aura' | 'applyStatus';
  params: Record<string, any>;
}

export interface Emitter extends EmitterDef {
  lastTrigger: number;
}

// Item modifier system
export interface ItemModifier {
  affectsEventTypes: ('damage' | 'heal' | 'spawnUnit' | 'projectile' | 'aura' | 'applyStatus')[];
  condition?: {
    tagsInclude?: string[];
    tagsExclude?: string[];
  };
  operation: 'addFlat' | 'multiply' | 'addTag' | 'convertDamageType' | 'addStatusOnHit' | 'addProcChance' | 'chain' | 'pierce' | 'knockback' | 'addEmitter';
  value?: number;
  emitterDef?: EmitterDef;
  statusId?: string;
  statusDuration?: number;
  procChance?: number;
  newTag?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  description: string;
  modifiers: ItemModifier[];
}

export interface Item {
  id: string;
  defId: string;
}

// Building system
export interface BuildingDef {
  id: string;
  name: string;
  icon: string;
  maxHp: number;
  radius: number;
  baseEmitters: EmitterDef[];
  description: string;
}

export interface Building {
  id: string;
  defId: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  sockets: (Item | null)[];
  emitters: Emitter[];
}

// Enemy system
export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  speed: number;
  damage: number;
  size: number;
  color: string;
  lootChance: number;
}

export interface Enemy {
  id: string;
  defId: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  velocity: Vec2;
  statuses: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  durationSec: number;
  stacks: number;
  potency: number;
  remainingTime: number;
}

// Allied unit system
export interface AllyUnit {
  id: string;
  defId: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  lastAttack: number;
  size: number;
  tags: string[];
  sourceBuilding: string;
}

// Resource nodes
export interface ResourceNode {
  id: string;
  type: 'tree' | 'ore';
  position: Vec2;
  size: number;
}

// Projectiles
export interface Projectile {
  id: string;
  position: Vec2;
  velocity: Vec2;
  damage: number;
  sourceEntityId: string;
  tags: string[];
  pierce: number;
  chain: number;
  hitTargets: Set<string>;
  lifetime: number;
}

// Loot drops
export interface LootDrop {
  id: string;
  position: Vec2;
  item: Item;
}

export interface GameState {
  phase: Phase;
  phaseTimer: number;
  dayDuration: number;
  nightDuration: number;
  waveNumber: number;

  townCore: Building;
  buildings: Building[];
  enemies: Enemy[];
  allyUnits: AllyUnit[];
  projectiles: Projectile[];
  resourceNodes: ResourceNode[];
  lootDrops: LootDrop[];

  inventory: Item[];
  selectedBuilding: Building | null;
  buildMode: BuildingDef | null;

  camera: Vec2;
  worldSize: Vec2;

  time: number;
  running: boolean;
  gameOver: boolean;
}
