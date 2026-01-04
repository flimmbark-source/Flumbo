import { Item, LootDrop, Vec2 } from '../types';
import { lootPool } from '../data/items';

/**
 * Handles loot generation and drops
 */
export class LootSystem {
  private idCounter = 0;

  generateLoot(): Item | null {
    const totalWeight = lootPool.reduce((sum, entry) => sum + entry.weight, 0);
    const roll = Math.random() * totalWeight;

    let accumulated = 0;
    for (const entry of lootPool) {
      accumulated += entry.weight;
      if (roll <= accumulated) {
        return {
          id: `item_${this.idCounter++}`,
          defId: entry.defId
        };
      }
    }

    return null;
  }

  createDrop(position: Vec2, item: Item): LootDrop {
    return {
      id: `drop_${this.idCounter++}`,
      position: { ...position },
      item
    };
  }
}
