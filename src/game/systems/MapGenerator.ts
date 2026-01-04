import { Clearing, ForestPath, ResourceNode, Vec2 } from '../types';

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

  generateMap(worldSize: Vec2): { nodes: ResourceNode[]; paths: ForestPath[]; clearings: Clearing[] } {
    const nodes: ResourceNode[] = [];
    let idCounter = 0;

    const center: Vec2 = { x: worldSize.x / 2, y: worldSize.y / 2 };
    const clearings: Clearing[] = [
      { center, radius: 220, softness: 90 }
    ];

    const entryPoints: Vec2[] = [
      { x: worldSize.x / 2, y: 0 },
      { x: worldSize.x / 2, y: worldSize.y },
      { x: 0, y: worldSize.y * 0.35 },
      { x: worldSize.x, y: worldSize.y * 0.6 }
    ].map((p) => ({
      x: p.x + (this.random() - 0.5) * 120,
      y: p.y + (this.random() - 0.5) * 120
    }));

    const paths: ForestPath[] = entryPoints.map((from) => ({
      from,
      to: center,
      width: 180 + this.random() * 40
    }));

    // Additional meadow pockets off the main paths
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + this.random() * 0.6;
      const distance = 350 + this.random() * 250;
      const position: Vec2 = {
        x: center.x + Math.cos(angle) * distance,
        y: center.y + Math.sin(angle) * distance
      };
      clearings.push({
        center: position,
        radius: 140 + this.random() * 90,
        softness: 70
      });
    }

    // Dense forest generation using a jittered grid, leaving corridors and clearings open
    const spacing = 55;
    for (let x = spacing / 2; x < worldSize.x; x += spacing) {
      for (let y = spacing / 2; y < worldSize.y; y += spacing) {
        const pos: Vec2 = {
          x: x + (this.random() - 0.5) * spacing * 0.8,
          y: y + (this.random() - 0.5) * spacing * 0.8
        };

        if (this.inClearing(pos, clearings, paths)) continue;

        const isOre = this.random() < 0.28;
        const size = isOre ? 15 + this.random() * 6 : 20 + this.random() * 6;
        nodes.push({
          id: `${isOre ? 'ore' : 'tree'}_${idCounter++}`,
          type: isOre ? 'ore' : 'tree',
          position: pos,
          size,
          remainingResources: isOre ? 850 : 520,
          maxResources: isOre ? 850 : 520
        });
      }
    }

    return { nodes, paths, clearings };
  }

  private inClearing(pos: Vec2, clearings: Clearing[], paths: ForestPath[]): boolean {
    for (const clearing of clearings) {
      const dist = Math.sqrt(Math.pow(pos.x - clearing.center.x, 2) + Math.pow(pos.y - clearing.center.y, 2));
      if (dist < clearing.radius) return true;
    }

    for (const path of paths) {
      const dist = this.distanceToSegment(pos, path.from, path.to);
      if (dist < path.width / 2) return true;
    }

    return false;
  }

  private distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ap = { x: p.x - a.x, y: p.y - a.y };
    const abLenSq = ab.x * ab.x + ab.y * ab.y;
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLenSq));
    const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    return Math.sqrt(Math.pow(p.x - closest.x, 2) + Math.pow(p.y - closest.y, 2));
  }
}
