import { ResourceNode, Vec2 } from '../types';

/**
 * Deterministic map generation using seeded random
 */
export class MapGenerator {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  private random(): number {
    // Simple seeded random (LCG)
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  generateMap(worldSize: Vec2): ResourceNode[] {
    const nodes: ResourceNode[] = [];
    let idCounter = 0;

    // Generate trees
    const treeCount = 40;
    for (let i = 0; i < treeCount; i++) {
      const pos: Vec2 = {
        x: this.random() * worldSize.x,
        y: this.random() * worldSize.y
      };

      // Avoid center area (spawn zone)
      const centerDist = Math.sqrt(
        Math.pow(pos.x - worldSize.x / 2, 2) +
        Math.pow(pos.y - worldSize.y / 2, 2)
      );

      if (centerDist > 150) {
        nodes.push({
          id: `tree_${idCounter++}`,
          type: 'tree',
          position: pos,
          size: 20
        });
      }
    }

    // Generate ore rocks
    const oreCount = 30;
    for (let i = 0; i < oreCount; i++) {
      const pos: Vec2 = {
        x: this.random() * worldSize.x,
        y: this.random() * worldSize.y
      };

      const centerDist = Math.sqrt(
        Math.pow(pos.x - worldSize.x / 2, 2) +
        Math.pow(pos.y - worldSize.y / 2, 2)
      );

      if (centerDist > 150) {
        nodes.push({
          id: `ore_${idCounter++}`,
          type: 'ore',
          position: pos,
          size: 16
        });
      }
    }

    return nodes;
  }
}
