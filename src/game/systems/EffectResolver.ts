import { GameEvent, Building, ItemModifier, DamageEvent, HealEvent, SpawnUnitEvent } from '../types';
import { itemDefs } from '../data/items';

/**
 * Central effect resolver - processes all game events through socketed item modifiers.
 * This is building-agnostic and works with any event type.
 */
export class EffectResolver {
  /**
   * Resolve an event by applying all modifiers from socketed items.
   * Returns an array of events (can split/chain events).
   */
  resolveEvent(event: GameEvent, building: Building): GameEvent[] {
    const modifiers = this.getModifiersFromBuilding(building);

    let results: GameEvent[] = [event];

    // Apply each modifier sequentially
    for (const modifier of modifiers) {
      const newResults: GameEvent[] = [];

      for (const evt of results) {
        const modified = this.applyModifier(evt, modifier, building);
        newResults.push(...modified);
      }

      results = newResults;
    }

    return results;
  }

  private getModifiersFromBuilding(building: Building): ItemModifier[] {
    const modifiers: ItemModifier[] = [];

    for (const socket of building.sockets) {
      if (socket) {
        const itemDef = itemDefs[socket.defId];
        if (itemDef) {
          modifiers.push(...itemDef.modifiers);
        }
      }
    }

    return modifiers;
  }

  private applyModifier(event: GameEvent, modifier: ItemModifier, _building: Building): GameEvent[] {
    // Check if modifier affects this event type
    if (!modifier.affectsEventTypes.includes(event.type)) {
      return [event];
    }

    // Check condition filters
    if (modifier.condition) {
      if (modifier.condition.tagsInclude) {
        const hasRequired = modifier.condition.tagsInclude.every(tag =>
          event.tags.includes(tag)
        );
        if (!hasRequired) return [event];
      }

      if (modifier.condition.tagsExclude) {
        const hasExcluded = modifier.condition.tagsExclude.some(tag =>
          event.tags.includes(tag)
        );
        if (hasExcluded) return [event];
      }
    }

    // Apply operation based on event type
    const modified = { ...event };

    switch (modifier.operation) {
      case 'addFlat':
        if (event.type === 'damage' && typeof modifier.value === 'number') {
          (modified as DamageEvent).amount += modifier.value;
        } else if (event.type === 'heal' && typeof modifier.value === 'number') {
          (modified as HealEvent).amount += modifier.value;
        } else if (event.type === 'spawnUnit' && typeof modifier.value === 'number') {
          // Add HP to spawned unit
          (modified as SpawnUnitEvent).stats.bonusHp =
            ((modified as SpawnUnitEvent).stats.bonusHp || 0) + modifier.value;
        }
        break;

      case 'multiply':
        if (event.type === 'damage' && typeof modifier.value === 'number') {
          (modified as DamageEvent).amount *= modifier.value;
        } else if (event.type === 'heal' && typeof modifier.value === 'number') {
          (modified as HealEvent).amount *= modifier.value;
        }
        break;

      case 'addTag':
        if (modifier.newTag) {
          modified.tags = [...modified.tags, modifier.newTag];
        }
        break;

      case 'convertDamageType':
        if (event.type === 'damage') {
          (modified as DamageEvent).damageType = 'fire';
        }
        break;

      case 'chain':
        if (event.type === 'damage' && typeof modifier.value === 'number') {
          (modified as DamageEvent).chain =
            ((modified as DamageEvent).chain || 0) + modifier.value;
        }
        break;

      case 'pierce':
        if (event.type === 'damage' && typeof modifier.value === 'number') {
          (modified as DamageEvent).pierce =
            ((modified as DamageEvent).pierce || 0) + modifier.value;
        }
        break;

      case 'knockback':
        if (event.type === 'damage' && typeof modifier.value === 'number') {
          (modified as DamageEvent).knockback =
            ((modified as DamageEvent).knockback || 0) + modifier.value;
        }
        break;

      case 'addStatusOnHit':
        // When damage hits, create an additional status effect event
        if (event.type === 'damage' && modifier.statusId && modifier.statusDuration) {
          const statusEvent: GameEvent = {
            type: 'applyStatus',
            statusId: modifier.statusId,
            durationSec: modifier.statusDuration,
            stacks: 1,
            potency: 1,
            tags: [],
            sourceEntityId: event.sourceEntityId,
            targetEntityId: event.targetEntityId
          };
          return [modified, statusEvent];
        }
        break;
    }

    return [modified];
  }

  /**
   * Check if building has cursed skull (which causes self-damage)
   */
  hasCursedSkull(building: Building): boolean {
    return building.sockets.some(socket =>
      socket && socket.defId === 'cursedSkull'
    );
  }
}
