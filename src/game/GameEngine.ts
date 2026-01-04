import {
  GameState, Building, Enemy, Vec2,
  HealEvent, SpawnUnitEvent, ProjectileEvent, ApplyStatusEvent
} from './types';
import { buildingDefs } from './data/buildings';
import { enemyDefs, guardUnitDef } from './data/enemies';
import { MapGenerator } from './systems/MapGenerator';
import { LootSystem } from './systems/LootSystem';
import { EffectResolver } from './systems/EffectResolver';
import { EmitterSystem } from './systems/EmitterSystem';

export class GameEngine {
  state: GameState;
  private mapGen: MapGenerator;
  private lootSystem: LootSystem;
  private effectResolver: EffectResolver;
  private emitterSystem: EmitterSystem;
  private idCounter = 0;

  constructor() {
    this.mapGen = new MapGenerator(12345);
    this.lootSystem = new LootSystem();
    this.effectResolver = new EffectResolver();
    this.emitterSystem = new EmitterSystem();

    const worldSize: Vec2 = { x: 1600, y: 1200 };

    // Create town core
    const townCore: Building = {
      id: 'core_0',
      defId: 'townCore',
      position: { x: worldSize.x / 2, y: worldSize.y / 2 },
      hp: 1000,
      maxHp: 1000,
      sockets: [null, null],
      emitters: []
    };

    this.state = {
      phase: 'DAY',
      phaseTimer: 60,
      dayDuration: 60,
      nightDuration: 60,
      waveNumber: 0,

      townCore,
      buildings: [],
      enemies: [],
      allyUnits: [],
      projectiles: [],
      resourceNodes: this.mapGen.generateMap(worldSize),
      lootDrops: [],

      inventory: [],
      selectedBuilding: null,
      buildMode: null,

      camera: { x: 0, y: 0 },
      worldSize,

      time: 0,
      running: true,
      gameOver: false
    };
  }

  update(deltaTime: number): void {
    if (!this.state.running || this.state.gameOver) return;

    this.state.time += deltaTime;

    // Update phase timer
    this.updatePhaseTimer(deltaTime);

    // Apply cursed skull damage
    this.applyCursedSkullDamage(deltaTime);

    // Update emitters
    this.updateEmitters();

    // Update entities
    this.updateEnemies(deltaTime);
    this.updateAllyUnits(deltaTime);
    this.updateProjectiles(deltaTime);

    // Check win/loss
    if (this.state.townCore.hp <= 0) {
      this.state.gameOver = true;
      this.state.running = false;
    }
  }

  private updatePhaseTimer(deltaTime: number): void {
    this.state.phaseTimer -= deltaTime;

    if (this.state.phaseTimer <= 0) {
      if (this.state.phase === 'DAY') {
        // Switch to night
        this.state.phase = 'NIGHT';
        this.state.phaseTimer = this.state.nightDuration;
        this.state.waveNumber++;
        this.spawnWave();
      } else {
        // Switch to day
        this.state.phase = 'DAY';
        this.state.phaseTimer = this.state.dayDuration;
        // Clear remaining enemies
        this.state.enemies = [];
      }
    }
  }

  private spawnWave(): void {
    const wave = this.state.waveNumber;
    const worldSize = this.state.worldSize;

    // Spawn enemies from edges
    const baseCount = 5 + wave * 3;

    for (let i = 0; i < baseCount; i++) {
      const side = Math.floor(Math.random() * 4);
      let position: Vec2;

      switch (side) {
        case 0: // Top
          position = { x: Math.random() * worldSize.x, y: 0 };
          break;
        case 1: // Right
          position = { x: worldSize.x, y: Math.random() * worldSize.y };
          break;
        case 2: // Bottom
          position = { x: Math.random() * worldSize.x, y: worldSize.y };
          break;
        default: // Left
          position = { x: 0, y: Math.random() * worldSize.y };
      }

      // Choose enemy type based on wave
      let defId = 'goblin';
      if (wave >= 3 && Math.random() < 0.3) defId = 'orc';
      if (wave >= 5 && Math.random() < 0.2) defId = 'troll';

      const def = enemyDefs[defId];
      this.state.enemies.push({
        id: `enemy_${this.idCounter++}`,
        defId,
        position,
        hp: def.maxHp,
        maxHp: def.maxHp,
        velocity: { x: 0, y: 0 },
        statuses: []
      });
    }
  }

  private applyCursedSkullDamage(deltaTime: number): void {
    const allBuildings = [this.state.townCore, ...this.state.buildings];

    for (const building of allBuildings) {
      if (this.effectResolver.hasCursedSkull(building)) {
        building.hp -= 2 * deltaTime;
        if (building.hp < 0) building.hp = 0;
      }
    }
  }

  private updateEmitters(): void {
    const allBuildings = [this.state.townCore, ...this.state.buildings];

    for (const building of allBuildings) {
      if (building.hp <= 0) continue;

      const triggered = this.emitterSystem.getTriggeredEmitters(building, this.state.time);

      for (const emitter of triggered) {
        for (const template of emitter.produces) {
          this.executeEventTemplate(template, emitter, building);
        }
      }
    }
  }

  private executeEventTemplate(template: any, emitter: any, building: Building): void {
    const params = emitter.params;

    if (template.eventType === 'projectile') {
      const target = this.findTarget(emitter.targeting, building, params.radius);
      if (target) {
        const event: ProjectileEvent = {
          type: 'projectile',
          projectileDefId: 'arrow',
          stats: { damage: params.projectileDamage || 10 },
          tags: [],
          sourceEntityId: building.id,
          targetEntityId: target.id
        };

        const resolved = this.effectResolver.resolveEvent(event, building);
        for (const evt of resolved) {
          if (evt.type === 'projectile') {
            this.createProjectile(evt as ProjectileEvent, target.position);
          }
        }
      }
    } else if (template.eventType === 'heal') {
      const target = this.findAllyTarget(emitter.targeting, building, params.radius);
      if (target) {
        const event: HealEvent = {
          type: 'heal',
          amount: params.heal || 10,
          sourceEntityId: building.id,
          targetEntityId: target.id,
          tags: []
        };

        const resolved = this.effectResolver.resolveEvent(event, building);
        for (const evt of resolved) {
          if (evt.type === 'heal') {
            this.applyHeal(evt as HealEvent);
          }
        }
      }
    } else if (template.eventType === 'spawnUnit') {
      const event: SpawnUnitEvent = {
        type: 'spawnUnit',
        unitDefId: params.unitDefId || 'guard',
        stats: {},
        tags: [],
        sourceEntityId: building.id
      };

      const resolved = this.effectResolver.resolveEvent(event, building);
      for (const evt of resolved) {
        if (evt.type === 'spawnUnit') {
          this.spawnUnit(evt as SpawnUnitEvent, building);
        }
      }
    } else if (template.eventType === 'applyStatus') {
      // Apply to all enemies in radius
      const enemies = this.findEnemiesInRadius(building.position, params.radius || 100);
      for (const enemy of enemies) {
        const event: ApplyStatusEvent = {
          type: 'applyStatus',
          statusId: params.statusId || 'slow',
          durationSec: params.durationSec || 2,
          stacks: 1,
          potency: params.potency || 0.5,
          tags: [],
          sourceEntityId: building.id,
          targetEntityId: enemy.id
        };

        this.applyStatus(event, enemy);
      }
    }
  }

  private findTarget(targeting: string, building: Building, radius: number): Enemy | null {
    if (targeting === 'nearestEnemy') {
      let nearest: Enemy | null = null;
      let minDist = radius;

      for (const enemy of this.state.enemies) {
        const dist = this.distance(building.position, enemy.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      }

      return nearest;
    }

    return null;
  }

  private findAllyTarget(targeting: string, building: Building, radius: number): Building | null {
    if (targeting === 'lowestHpAlly') {
      const allBuildings = [this.state.townCore, ...this.state.buildings];
      let lowest: Building | null = null;
      let lowestHpPercent = 1;

      for (const b of allBuildings) {
        const dist = this.distance(building.position, b.position);
        if (dist <= radius && b.hp < b.maxHp) {
          const hpPercent = b.hp / b.maxHp;
          if (hpPercent < lowestHpPercent) {
            lowestHpPercent = hpPercent;
            lowest = b;
          }
        }
      }

      return lowest;
    }

    return null;
  }

  private findEnemiesInRadius(position: Vec2, radius: number): Enemy[] {
    return this.state.enemies.filter(enemy => {
      const dist = this.distance(position, enemy.position);
      return dist <= radius;
    });
  }

  private createProjectile(event: ProjectileEvent, targetPos: Vec2): void {
    const sourceBuilding = this.findBuildingById(event.sourceEntityId);
    if (!sourceBuilding) return;

    const dir = this.normalize({
      x: targetPos.x - sourceBuilding.position.x,
      y: targetPos.y - sourceBuilding.position.y
    });

    this.state.projectiles.push({
      id: `proj_${this.idCounter++}`,
      position: { ...sourceBuilding.position },
      velocity: { x: dir.x * 300, y: dir.y * 300 },
      damage: event.stats.damage || 10,
      sourceEntityId: event.sourceEntityId,
      tags: event.tags,
      pierce: 0,
      chain: 0,
      hitTargets: new Set(),
      lifetime: 3
    });
  }

  private applyHeal(event: HealEvent): void {
    const target = this.findBuildingById(event.targetEntityId);
    if (target) {
      target.hp = Math.min(target.hp + event.amount, target.maxHp);
    }
  }

  private spawnUnit(event: SpawnUnitEvent, building: Building): void {
    const bonusHp = event.stats.bonusHp || 0;
    let bonusSpeed = event.stats.bonusSpeed || 0;

    // Apply tag-based bonuses
    if (event.tags.includes('swift')) {
      bonusSpeed += 20;
    }

    const offset = Math.random() * Math.PI * 2;
    const distance = 40;

    this.state.allyUnits.push({
      id: `unit_${this.idCounter++}`,
      defId: event.unitDefId,
      position: {
        x: building.position.x + Math.cos(offset) * distance,
        y: building.position.y + Math.sin(offset) * distance
      },
      hp: guardUnitDef.maxHp + bonusHp,
      maxHp: guardUnitDef.maxHp + bonusHp,
      speed: guardUnitDef.speed + bonusSpeed,
      damage: guardUnitDef.damage,
      attackCooldown: guardUnitDef.attackCooldown,
      lastAttack: 0,
      size: guardUnitDef.size,
      tags: event.tags,
      sourceBuilding: building.id
    });
  }

  private applyStatus(event: ApplyStatusEvent, enemy: Enemy): void {
    const existing = enemy.statuses.find(s => s.id === event.statusId);

    if (existing) {
      existing.remainingTime = event.durationSec;
      existing.stacks = Math.min(existing.stacks + event.stacks, 10);
    } else {
      enemy.statuses.push({
        id: event.statusId,
        durationSec: event.durationSec,
        stacks: event.stacks,
        potency: event.potency,
        remainingTime: event.durationSec
      });
    }
  }

  private updateEnemies(deltaTime: number): void {
    const core = this.state.townCore;

    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.state.enemies[i];
      const def = enemyDefs[enemy.defId];

      // Update statuses
      for (let j = enemy.statuses.length - 1; j >= 0; j--) {
        const status = enemy.statuses[j];
        status.remainingTime -= deltaTime;

        if (status.id === 'poison') {
          enemy.hp -= 10 * deltaTime;
        }

        if (status.remainingTime <= 0) {
          enemy.statuses.splice(j, 1);
        }
      }

      // Calculate speed modifier
      let speedMod = 1;
      const slowStatus = enemy.statuses.find(s => s.id === 'slow');
      if (slowStatus) {
        speedMod = 1 - slowStatus.potency;
      }

      // Move toward core
      const toCore = {
        x: core.position.x - enemy.position.x,
        y: core.position.y - enemy.position.y
      };
      const dist = Math.sqrt(toCore.x * toCore.x + toCore.y * toCore.y);

      if (dist > 0) {
        enemy.velocity.x = (toCore.x / dist) * def.speed * speedMod;
        enemy.velocity.y = (toCore.y / dist) * def.speed * speedMod;
      }

      enemy.position.x += enemy.velocity.x * deltaTime;
      enemy.position.y += enemy.velocity.y * deltaTime;

      // Check collision with core
      if (this.distance(enemy.position, core.position) < 50) {
        core.hp -= def.damage;
        this.state.enemies.splice(i, 1);
        continue;
      }

      // Check collision with buildings
      for (const building of this.state.buildings) {
        const buildingDef = buildingDefs[building.defId];
        if (this.distance(enemy.position, building.position) < buildingDef.radius + def.size) {
          building.hp -= def.damage;
          this.state.enemies.splice(i, 1);
          break;
        }
      }

      // Remove dead
      if (enemy.hp <= 0) {
        this.onEnemyDeath(enemy);
        this.state.enemies.splice(i, 1);
      }
    }
  }

  private updateAllyUnits(deltaTime: number): void {
    for (let i = this.state.allyUnits.length - 1; i >= 0; i--) {
      const unit = this.state.allyUnits[i];

      // Find nearest enemy
      let nearest: Enemy | null = null;
      let minDist = Infinity;

      for (const enemy of this.state.enemies) {
        const dist = this.distance(unit.position, enemy.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      }

      if (nearest) {
        // Move toward enemy
        if (minDist > guardUnitDef.attackRange) {
          const dir = this.normalize({
            x: nearest.position.x - unit.position.x,
            y: nearest.position.y - unit.position.y
          });

          unit.position.x += dir.x * unit.speed * deltaTime;
          unit.position.y += dir.y * unit.speed * deltaTime;
        } else {
          // Attack
          const timeSinceAttack = this.state.time - unit.lastAttack;
          if (timeSinceAttack >= unit.attackCooldown) {
            nearest.hp -= unit.damage;
            unit.lastAttack = this.state.time;
          }
        }
      }

      // Remove dead units
      if (unit.hp <= 0) {
        this.state.allyUnits.splice(i, 1);
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];

      proj.position.x += proj.velocity.x * deltaTime;
      proj.position.y += proj.velocity.y * deltaTime;
      proj.lifetime -= deltaTime;

      // Check collision with enemies
      for (const enemy of this.state.enemies) {
        if (proj.hitTargets.has(enemy.id)) continue;

        const dist = this.distance(proj.position, enemy.position);
        if (dist < 20) {
          enemy.hp -= proj.damage;
          proj.hitTargets.add(enemy.id);

          // Check for pierce
          if (proj.pierce <= 0) {
            this.state.projectiles.splice(i, 1);
            break;
          } else {
            proj.pierce--;
          }
        }
      }

      // Remove if out of bounds or expired
      if (proj.lifetime <= 0 ||
          proj.position.x < 0 || proj.position.x > this.state.worldSize.x ||
          proj.position.y < 0 || proj.position.y > this.state.worldSize.y) {
        this.state.projectiles.splice(i, 1);
      }
    }
  }

  private onEnemyDeath(enemy: Enemy): void {
    const def = enemyDefs[enemy.defId];

    if (Math.random() < def.lootChance) {
      const item = this.lootSystem.generateLoot();
      if (item) {
        const drop = this.lootSystem.createDrop(enemy.position, item);
        this.state.lootDrops.push(drop);
      }
    }
  }

  placeBuilding(defId: string, position: Vec2): boolean {
    const def = buildingDefs[defId];
    if (!def) return false;

    // Check for overlaps
    const allBuildings = [this.state.townCore, ...this.state.buildings];
    for (const existing of allBuildings) {
      const existingDef = buildingDefs[existing.defId];
      const dist = this.distance(position, existing.position);
      if (dist < def.radius + existingDef.radius) {
        return false;
      }
    }

    // Check for resource nodes
    for (const node of this.state.resourceNodes) {
      const dist = this.distance(position, node.position);
      if (dist < def.radius + node.size) {
        return false;
      }
    }

    const building: Building = {
      id: `building_${this.idCounter++}`,
      defId,
      position: { ...position },
      hp: def.maxHp,
      maxHp: def.maxHp,
      sockets: [null, null],
      emitters: []
    };

    this.emitterSystem.rebuildEmitters(building, def.baseEmitters);
    this.state.buildings.push(building);
    return true;
  }

  pickupLoot(dropId: string): void {
    const index = this.state.lootDrops.findIndex(d => d.id === dropId);
    if (index >= 0) {
      const drop = this.state.lootDrops[index];
      this.state.inventory.push(drop.item);
      this.state.lootDrops.splice(index, 1);
    }
  }

  socketItem(building: Building, socketIndex: number, itemId: string | null): void {
    if (socketIndex < 0 || socketIndex >= 2) return;

    if (itemId === null) {
      const removed = building.sockets[socketIndex];
      building.sockets[socketIndex] = null;

      if (removed) {
        this.state.inventory.push(removed);
      }
    } else {
      const itemIndex = this.state.inventory.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        const item = this.state.inventory[itemIndex];
        this.state.inventory.splice(itemIndex, 1);

        const existing = building.sockets[socketIndex];
        if (existing) {
          this.state.inventory.push(existing);
        }

        building.sockets[socketIndex] = item;
      }
    }

    const def = buildingDefs[building.defId];
    this.emitterSystem.rebuildEmitters(building, def.baseEmitters);
  }

  private findBuildingById(id: string): Building | null {
    if (this.state.townCore.id === id) return this.state.townCore;
    return this.state.buildings.find(b => b.id === id) || null;
  }

  private distance(a: Vec2, b: Vec2): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private normalize(v: Vec2): Vec2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
  }
}
