import { Clearing, ForestPath, ResourceNode, Vec2 } from '../types';

/**
 * Deterministic map generation with many natural pathways
 * Creates a web of interconnected trails and clearings
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

    const sizeScale = 1 / 3;

    const center: Vec2 = { x: worldSize.x / 2, y: worldSize.y / 2 };
    const clearings: Clearing[] = [
      // Central clearing (scaled down)
      { center, radius: 100 * sizeScale, softness: 40 * sizeScale }
    ];

    // Create small clearings scattered across the map
    const clearingCount = 12;
    for (let i = 0; i < clearingCount; i++) {
      const angle = (Math.PI * 2 * i) / clearingCount + this.random() * 0.5;
      const distance = 130 + this.random() * 250;
      const position: Vec2 = {
        x: center.x + Math.cos(angle) * distance,
        y: center.y + Math.sin(angle) * distance
      };

      // Vary clearing sizes (compact for single-screen)
      const radius = (35 + this.random() * 50) * sizeScale;
      clearings.push({
        center: position,
        radius,
        softness: (20 + this.random() * 15) * sizeScale
      });
    }

    // Additional random clearings for more variety
    for (let i = 0; i < 6; i++) {
      const position: Vec2 = {
        x: this.random() * worldSize.x,
        y: this.random() * worldSize.y
      };

      clearings.push({
        center: position,
        radius: (25 + this.random() * 35) * sizeScale,
        softness: (15 + this.random() * 12) * sizeScale
      });
    }

    // Create many small pathways connecting clearings
    const paths: ForestPath[] = [];

    // Connect each clearing to 2-4 nearby clearings
    for (let i = 0; i < clearings.length; i++) {
      const clearing = clearings[i];
      const connectionCount = Math.floor(2 + this.random() * 3); // 2-4 connections

      // Find nearest clearings
      const distances = clearings
        .map((c, index) => ({
          index,
          dist: Math.sqrt(
            Math.pow(c.center.x - clearing.center.x, 2) +
            Math.pow(c.center.y - clearing.center.y, 2)
          )
        }))
        .filter(d => d.index !== i) // Exclude self
        .sort((a, b) => a.dist - b.dist);

      // Connect to nearest clearings
      for (let j = 0; j < Math.min(connectionCount, distances.length); j++) {
        const targetClearing = clearings[distances[j].index];

        // Check if path already exists (avoid duplicates)
        const pathExists = paths.some(p =>
          (this.samePoint(p.from, clearing.center) && this.samePoint(p.to, targetClearing.center)) ||
          (this.samePoint(p.from, targetClearing.center) && this.samePoint(p.to, clearing.center))
        );

        if (!pathExists) {
          // Create winding path with slight curve
          const midpoint: Vec2 = {
            x: (clearing.center.x + targetClearing.center.x) / 2 + (this.random() - 0.5) * 40,
            y: (clearing.center.y + targetClearing.center.y) / 2 + (this.random() - 0.5) * 40
          };

          // Add two segments to create a curve
          paths.push({
            from: clearing.center,
            to: midpoint,
            width: (35 + this.random() * 35) * sizeScale
          });

          paths.push({
            from: midpoint,
            to: targetClearing.center,
            width: (35 + this.random() * 35) * sizeScale
          });
        }
      }
    }

    // Add some straight paths from map edges to clearings (entry points)
    const edgeEntryCount = 4;
    for (let i = 0; i < edgeEntryCount; i++) {
      const side = Math.floor(this.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
      let entryPoint: Vec2;

      switch (side) {
        case 0: // Top
          entryPoint = { x: this.random() * worldSize.x, y: 0 };
          break;
        case 1: // Right
          entryPoint = { x: worldSize.x, y: this.random() * worldSize.y };
          break;
        case 2: // Bottom
          entryPoint = { x: this.random() * worldSize.x, y: worldSize.y };
          break;
        default: // Left
          entryPoint = { x: 0, y: this.random() * worldSize.y };
      }

      // Find nearest clearing
      let nearestClearing = clearings[0];
      let minDist = Infinity;
      for (const clearing of clearings) {
        const dist = Math.sqrt(
          Math.pow(clearing.center.x - entryPoint.x, 2) +
          Math.pow(clearing.center.y - entryPoint.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestClearing = clearing;
        }
      }

      paths.push({
        from: entryPoint,
        to: nearestClearing.center,
        width: (45 + this.random() * 35) * sizeScale
      });
    }

    // Dense forest generation using a jittered grid, leaving corridors and clearings open
    const spacing = 45;
    for (let x = spacing / 2; x < worldSize.x; x += spacing) {
      for (let y = spacing / 2; y < worldSize.y; y += spacing) {
        const pos: Vec2 = {
          x: x + (this.random() - 0.5) * spacing * 0.8,
          y: y + (this.random() - 0.5) * spacing * 0.8
        };

        if (this.inClearing(pos, clearings, paths)) continue;

        const isOre = this.random() < 0.28;
        const size = (isOre ? 15 + this.random() * 6 : 20 + this.random() * 6) * sizeScale;
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

  private samePoint(a: Vec2, b: Vec2): boolean {
    return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
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
