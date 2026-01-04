import {
  GameState, Building, Enemy, Vec2, ResourceCost, AllyUnit, ResourceNode,
  HealEvent, SpawnUnitEvent, ProjectileEvent, ApplyStatusEvent
} from './types';
import { buildingDefs } from './data/buildings';
import { enemyDefs, unitDefs } from './data/enemies';
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

    const worldSize: Vec2 = { x: 4000, y: 3000 };

    // Create Town Hall (RTS core building)
    const townHall: Building = {
      id: 'building_0',
      defId: 'townHall',
      position: { x: -9999, y: -9999 },
      hp: 2000,
      maxHp: 2000,
      sockets: [null, null],
      emitters: [],
      constructionProgress: 1.0
    };

    this.emitterSystem.rebuildEmitters(townHall, buildingDefs.townHall.baseEmitters);

    const map = this.mapGen.generateMap(worldSize);

    this.state = {
      phase: 'DAY',
      phaseTimer: 90,
      dayDuration: 90,
      nightDuration: 60,
      waveNumber: 0,
      awaitingTownPlacement: true,

      resources: {
        wood: 200,
        ore: 150,
        gold: 100
      },

      townCore: townHall,
      buildings: [],
      enemies: [],
      allyUnits: [],
      projectiles: [],
      resourceNodes: map.nodes,
      forestPaths: map.paths,
      clearings: map.clearings,
      lootDrops: [],

      inventory: [],
      selectedBuilding: null,
      selectedUnits: [],
      buildMenuPosition: null,
      buildMode: null,

      camera: { x: 0, y: 0 },
      worldSize,

      time: 0,
      running: false,
      gameOver: false
    };
  }

  update(deltaTime: number): void {
    if (!this.state.running || this.state.gameOver || this.state.awaitingTownPlacement) return;

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

    // Update resource nodes (remove depleted)
    this.cleanupDepletedNodes();

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
        console.log('☀️ → 🌙 Transitioning DAY to NIGHT');
        this.state.phase = 'NIGHT';
        this.state.phaseTimer = this.state.nightDuration;
        this.state.waveNumber++;
        this.spawnWave();
      } else {
        console.log('🌙 → ☀️ Transitioning NIGHT to DAY');
        this.state.phase = 'DAY';
        this.state.phaseTimer = this.state.dayDuration;
        this.state.enemies = [];
      }
    }
  }

  startWaveEarly(): void {
    if (this.state.phase === 'DAY' && !this.state.awaitingTownPlacement) {
      this.state.phase = 'NIGHT';
      this.state.phaseTimer = this.state.nightDuration;
      this.state.waveNumber++;
      this.spawnWave();
    }
  }

  private spawnWave(): void {
    const wave = this.state.waveNumber;
    const worldSize = this.state.worldSize;
    const baseCount = 5 + wave * 3;

    console.log(`🌙 Spawning wave ${wave} with ${baseCount} enemies`);

    // Spawn enemies in clearings near map edges to avoid getting stuck in dense forest
    const edgeClearings = this.state.clearings.filter(c => {
      const edgeDist = Math.min(
        c.center.x,
        worldSize.x - c.center.x,
        c.center.y,
        worldSize.y - c.center.y
      );
      return edgeDist < 500; // Clearings within 500 units of any edge
    });

    for (let i = 0; i < baseCount; i++) {
      let position: Vec2;

      if (edgeClearings.length > 0) {
        // Spawn in a random edge clearing
        const clearing = edgeClearings[Math.floor(Math.random() * edgeClearings.length)];
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * clearing.radius * 0.7; // Spawn within clearing
        position = {
          x: clearing.center.x + Math.cos(angle) * radius,
          y: clearing.center.y + Math.sin(angle) * radius
        };
      } else {
        // Fallback: spawn slightly inward from edges to avoid dense forest
        const side = Math.floor(Math.random() * 4);
        const inset = 150; // Spawn 150 units inward from edge
        switch (side) {
          case 0: position = { x: Math.random() * worldSize.x, y: inset }; break;
          case 1: position = { x: worldSize.x - inset, y: Math.random() * worldSize.y }; break;
          case 2: position = { x: Math.random() * worldSize.x, y: worldSize.y - inset }; break;
          default: position = { x: inset, y: Math.random() * worldSize.y };
        }
      }

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

    console.log(`✅ Total enemies in state: ${this.state.enemies.length}`);
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
      if (building.constructionProgress && building.constructionProgress < 1.0) continue;

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
        unitDefId: params.unitDefId || 'worker',
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
      velocity: { x: dir.x * 400, y: dir.y * 400 },
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
    const unitDef = unitDefs[event.unitDefId];
    if (!unitDef) return;

    const bonusHp = event.stats.bonusHp || 0;
    let bonusSpeed = event.stats.bonusSpeed || 0;

    if (event.tags.includes('swift')) {
      bonusSpeed += 20;
    }

    const offset = Math.random() * Math.PI * 2;
    const distance = 50;

    const newUnit: AllyUnit = {
      id: `unit_${this.idCounter++}`,
      defId: event.unitDefId,
      position: {
        x: building.position.x + Math.cos(offset) * distance,
        y: building.position.y + Math.sin(offset) * distance
      },
      hp: unitDef.maxHp + bonusHp,
      maxHp: unitDef.maxHp + bonusHp,
      speed: unitDef.speed + bonusSpeed,
      damage: unitDef.damage,
      attackCooldown: unitDef.attackCooldown,
      lastAttack: 0,
      size: unitDef.size,
      tags: event.tags,
      sourceBuilding: building.id,
      role: unitDef.role
    };

    // Initialize worker gathering state
    if (unitDef.role === 'worker' && unitDef.gatherCapacity) {
      newUnit.gathering = {
        targetNodeId: '',
        resourceType: 'wood',
        amount: 0,
        maxCapacity: unitDef.gatherCapacity,
        returningToDepot: false
      };
    }

    this.state.allyUnits.push(newUnit);
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

      // Check collision before moving
      const newPos: Vec2 = {
        x: enemy.position.x + enemy.velocity.x * deltaTime,
        y: enemy.position.y + enemy.velocity.y * deltaTime
      };

      if (this.canMoveTo(newPos, def.size)) {
        enemy.position.x = newPos.x;
        enemy.position.y = newPos.y;
      }

      // Check collision with core
      if (this.distance(enemy.position, core.position) < 60) {
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

      if (enemy.hp <= 0) {
        this.onEnemyDeath(enemy);
        this.state.enemies.splice(i, 1);
      }
    }
  }

  private updateAllyUnits(deltaTime: number): void {
    for (let i = this.state.allyUnits.length - 1; i >= 0; i--) {
      const unit = this.state.allyUnits[i];
      const unitDef = unitDefs[unit.defId];

      // Worker-specific AI
      if (unit.role === 'worker' && unit.gathering) {
        this.updateWorkerAI(unit, unitDef, deltaTime);
        continue;
      }

      // Healer-specific AI
      if (unit.role === 'support') {
        this.updateHealerAI(unit, unitDef, deltaTime);
        continue;
      }

      // Fighter AI - Find nearest enemy and attack
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
        if (minDist > unitDef.attackRange) {
          const dir = this.normalize({
            x: nearest.position.x - unit.position.x,
            y: nearest.position.y - unit.position.y
          });

          const newPos: Vec2 = {
            x: unit.position.x + dir.x * unit.speed * deltaTime,
            y: unit.position.y + dir.y * unit.speed * deltaTime
          };

          if (this.canMoveTo(newPos, unit.size)) {
            unit.position.x = newPos.x;
            unit.position.y = newPos.y;
          }
        } else {
          const timeSinceAttack = this.state.time - unit.lastAttack;
          if (timeSinceAttack >= unit.attackCooldown) {
            nearest.hp -= unit.damage;
            unit.lastAttack = this.state.time;
          }
        }
      }

      if (unit.hp <= 0) {
        this.state.allyUnits.splice(i, 1);
      }
    }
  }

  private updateWorkerAI(unit: AllyUnit, unitDef: any, deltaTime: number): void {
    if (!unit.gathering) return;

    // If not assigned, find nearest resource node
    if (!unit.gathering.targetNodeId) {
      const nearestNode = this.findNearestResourceNode(unit.position);
      if (nearestNode) {
        unit.gathering.targetNodeId = nearestNode.id;
        unit.gathering.resourceType = nearestNode.type === 'tree' ? 'wood' : 'ore';
        unit.gathering.returningToDepot = false;
      }
      return;
    }

    // If returning to depot
    if (unit.gathering.returningToDepot) {
      const depot = this.findNearestDepot(unit.position);
      if (depot) {
        const dist = this.distance(unit.position, depot.position);

        if (dist > 50) {
          const dir = this.normalize({
            x: depot.position.x - unit.position.x,
            y: depot.position.y - unit.position.y
          });

          const newPos: Vec2 = {
            x: unit.position.x + dir.x * unit.speed * deltaTime,
            y: unit.position.y + dir.y * unit.speed * deltaTime
          };

          if (this.canMoveTo(newPos, unit.size)) {
            unit.position.x = newPos.x;
            unit.position.y = newPos.y;
          }
        } else {
          // Deposit resources
          if (unit.gathering.resourceType === 'wood') {
            this.state.resources.wood += unit.gathering.amount;
          } else {
            this.state.resources.ore += unit.gathering.amount;
          }
          unit.gathering.amount = 0;
          unit.gathering.returningToDepot = false;
          unit.gathering.targetNodeId = '';
        }
      }
      return;
    }

    // Moving to resource node
    const node = this.state.resourceNodes.find(n => n.id === unit.gathering!.targetNodeId);
    if (!node || node.remainingResources <= 0) {
      unit.gathering.targetNodeId = '';
      return;
    }

    const dist = this.distance(unit.position, node.position);

    if (dist > 40) {
      // Move toward node
      const dir = this.normalize({
        x: node.position.x - unit.position.x,
        y: node.position.y - unit.position.y
      });

      const newPos: Vec2 = {
        x: unit.position.x + dir.x * unit.speed * deltaTime,
        y: unit.position.y + dir.y * unit.speed * deltaTime
      };

      if (this.canMoveTo(newPos, unit.size)) {
        unit.position.x = newPos.x;
        unit.position.y = newPos.y;
      }
    } else {
      // Gather resources
      if (unit.gathering.amount < unit.gathering.maxCapacity && node.remainingResources > 0) {
        const gatherAmount = (unitDef.gatherRate || 10) * deltaTime;
        const actualGather = Math.min(gatherAmount,
          unit.gathering.maxCapacity - unit.gathering.amount,
          node.remainingResources
        );

        unit.gathering.amount += actualGather;
        node.remainingResources -= actualGather;

        // If full, return to depot
        if (unit.gathering.amount >= unit.gathering.maxCapacity) {
          unit.gathering.returningToDepot = true;
        }
      } else if (unit.gathering.amount > 0) {
        unit.gathering.returningToDepot = true;
      }
    }
  }

  private updateHealerAI(unit: AllyUnit, unitDef: any, deltaTime: number): void {
    // Find lowest HP ally
    let target: AllyUnit | null = null;
    let lowestHpPercent = 1;

    for (const ally of this.state.allyUnits) {
      if (ally.id === unit.id) continue;
      const hpPercent = ally.hp / ally.maxHp;
      if (hpPercent < lowestHpPercent && hpPercent < 1) {
        const dist = this.distance(unit.position, ally.position);
        if (dist <= unitDef.attackRange * 1.5) {
          lowestHpPercent = hpPercent;
          target = ally;
        }
      }
    }

    if (target) {
      const dist = this.distance(unit.position, target.position);

      if (dist > unitDef.attackRange) {
        const dir = this.normalize({
          x: target.position.x - unit.position.x,
          y: target.position.y - unit.position.y
        });

        const newPos: Vec2 = {
          x: unit.position.x + dir.x * unit.speed * deltaTime,
          y: unit.position.y + dir.y * unit.speed * deltaTime
        };

        if (this.canMoveTo(newPos, unit.size)) {
          unit.position.x = newPos.x;
          unit.position.y = newPos.y;
        }
      } else {
        const timeSinceHeal = this.state.time - unit.lastAttack;
        if (timeSinceHeal >= unit.attackCooldown) {
          target.hp = Math.min(target.hp + 25, target.maxHp);
          unit.lastAttack = this.state.time;
        }
      }
    }
  }

  private findNearestResourceNode(position: Vec2): ResourceNode | null {
    let nearest: ResourceNode | null = null;
    let minDist = Infinity;

    for (const node of this.state.resourceNodes) {
      if (node.remainingResources <= 0) continue;
      const dist = this.distance(position, node.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  private findNearestDepot(position: Vec2): Building | null {
    const depots = [this.state.townCore, ...this.state.buildings.filter(b =>
      b.defId === 'townHall' || b.defId === 'storageHut'
    )];

    let nearest: Building | null = null;
    let minDist = Infinity;

    for (const depot of depots) {
      const dist = this.distance(position, depot.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = depot;
      }
    }

    return nearest;
  }

  private cleanupDepletedNodes(): void {
    this.state.resourceNodes = this.state.resourceNodes.filter(
      node => node.remainingResources > 0
    );
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];

      proj.position.x += proj.velocity.x * deltaTime;
      proj.position.y += proj.velocity.y * deltaTime;
      proj.lifetime -= deltaTime;

      for (const enemy of this.state.enemies) {
        if (proj.hitTargets.has(enemy.id)) continue;

        const dist = this.distance(proj.position, enemy.position);
        if (dist < 20) {
          enemy.hp -= proj.damage;
          proj.hitTargets.add(enemy.id);

          if (proj.pierce <= 0) {
            this.state.projectiles.splice(i, 1);
            break;
          } else {
            proj.pierce--;
          }
        }
      }

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

    // Award gold for kills
    this.state.resources.gold += Math.floor(5 + this.state.waveNumber * 2);
  }

  placeBuilding(defId: string, position: Vec2): boolean {
    const def = buildingDefs[defId];
    if (!def) return false;

    // Check resource costs
    if (!this.canAfford(def.cost)) return false;

    // Check for overlaps
    const allBuildings = [this.state.townCore, ...this.state.buildings];
    for (const existing of allBuildings) {
      const existingDef = buildingDefs[existing.defId];
      const dist = this.distance(position, existing.position);
      if (dist < def.radius + existingDef.radius + 10) {
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

    // Deduct costs
    this.deductResources(def.cost);

    const building: Building = {
      id: `building_${this.idCounter++}`,
      defId,
      position: { ...position },
      hp: def.maxHp,
      maxHp: def.maxHp,
      sockets: [null, null],
      emitters: [],
      constructionProgress: 1.0
    };

    this.emitterSystem.rebuildEmitters(building, def.baseEmitters);
    this.state.buildings.push(building);
    return true;
  }

  placeTownCore(position: Vec2): boolean {
    if (!this.state.awaitingTownPlacement) return false;

    const def = buildingDefs.townHall;
    if (
      position.x - def.radius < 0 || position.x + def.radius > this.state.worldSize.x ||
      position.y - def.radius < 0 || position.y + def.radius > this.state.worldSize.y
    ) {
      return false;
    }

    for (const node of this.state.resourceNodes) {
      const dist = this.distance(position, node.position);
      if (dist < def.radius + node.size + 6) return false;
    }

    for (const building of this.state.buildings) {
      const existingDef = buildingDefs[building.defId];
      const dist = this.distance(position, building.position);
      if (dist < def.radius + existingDef.radius + 6) return false;
    }

    this.state.townCore.position = { ...position };
    this.state.awaitingTownPlacement = false;
    this.state.running = true;
    this.state.phaseTimer = this.state.dayDuration;
    this.state.time = 0;
    this.state.selectedBuilding = this.state.townCore;
    return true;
  }

  canAfford(cost: ResourceCost): boolean {
    return (
      (cost.wood || 0) <= this.state.resources.wood &&
      (cost.ore || 0) <= this.state.resources.ore &&
      (cost.gold || 0) <= this.state.resources.gold
    );
  }

  private deductResources(cost: ResourceCost): void {
    this.state.resources.wood -= (cost.wood || 0);
    this.state.resources.ore -= (cost.ore || 0);
    this.state.resources.gold -= (cost.gold || 0);
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

  /**
   * Check if a position would collide with resource nodes (trees/ore)
   * Returns true if the position is valid (no collision)
   */
  private canMoveTo(position: Vec2, unitSize: number = 10): boolean {
    for (const node of this.state.resourceNodes) {
      const dist = this.distance(position, node.position);
      const minDist = node.size + unitSize;

      if (dist < minDist) {
        return false; // Collision detected
      }
    }
    return true; // No collision
  }
}
