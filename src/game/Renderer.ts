import { GameState, Building, Enemy, Vec2, AllyUnit } from './types';
import { buildingDefs } from './data/buildings';
import { enemyDefs, unitDefs } from './data/enemies';

/**
 * Isometric 2.5D Renderer - Warcraft 3 style
 * Uses pseudo-isometric projection for a 2.5D aesthetic
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    const camera = state.camera;

    // Clear with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw ground
    this.drawGround(state);

    // Collect all entities for depth sorting
    const entities: Array<{ y: number; draw: () => void }> = [];

    // Add resource nodes
    for (const node of state.resourceNodes) {
      entities.push({
        y: node.position.y,
        draw: () => this.drawResourceNode(node)
      });
    }

    // Add buildings
    entities.push({
      y: state.townCore.position.y,
      draw: () => this.drawBuilding(state.townCore, state, true)
    });
    for (const building of state.buildings) {
      entities.push({
        y: building.position.y,
        draw: () => this.drawBuilding(building, state, false)
      });
    }

    // Add enemies
    for (const enemy of state.enemies) {
      entities.push({
        y: enemy.position.y,
        draw: () => this.drawEnemy(enemy)
      });
    }

    // Add ally units
    for (const unit of state.allyUnits) {
      entities.push({
        y: unit.position.y,
        draw: () => this.drawAllyUnit(unit, state)
      });
    }

    // Add loot drops
    for (const drop of state.lootDrops) {
      entities.push({
        y: drop.position.y,
        draw: () => this.drawLootDrop(drop.position)
      });
    }

    // Add projectiles
    for (const proj of state.projectiles) {
      entities.push({
        y: proj.position.y,
        draw: () => this.drawProjectile(proj.position)
      });
    }

    // Sort by Y position (painter's algorithm for depth)
    entities.sort((a, b) => a.y - b.y);

    // Draw all entities in sorted order
    for (const entity of entities) {
      entity.draw();
    }

    // Draw build menu indicator if active
    if (state.buildMenuPosition) {
      this.drawBuildMenuIndicator(state.buildMenuPosition);
    }

    ctx.restore();

    // Draw game over screen
    if (state.gameOver) {
      this.drawGameOver(state);
    }
  }

  private drawGround(state: GameState): void {
    const ctx = this.ctx;
    const worldSize = state.worldSize;

    const baseGradient = ctx.createLinearGradient(0, 0, worldSize.x, worldSize.y);
    baseGradient.addColorStop(0, '#0f1a0f');
    baseGradient.addColorStop(1, '#0b120c');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, worldSize.x, worldSize.y);

    // Dappled forest shading
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 160; i++) {
      const radius = 60 + Math.random() * 140;
      const x = Math.random() * worldSize.x;
      const y = Math.random() * worldSize.y;
      const spot = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
      spot.addColorStop(0, 'rgba(40,70,40,0.6)');
      spot.addColorStop(1, 'rgba(20,30,20,0)');
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Paths and clearings
    ctx.save();
    ctx.strokeStyle = '#3b4f3b';
    ctx.lineCap = 'round';
    for (const path of state.forestPaths) {
      const grad = ctx.createLinearGradient(path.from.x, path.from.y, path.to.x, path.to.y);
      grad.addColorStop(0, '#2f3f2f');
      grad.addColorStop(1, '#3d5238');
      ctx.strokeStyle = grad;
      ctx.lineWidth = path.width;
      ctx.beginPath();
      ctx.moveTo(path.from.x, path.from.y);
      ctx.lineTo(path.to.x, path.to.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(200,230,160,0.25)';
      ctx.lineWidth = path.width * 0.5;
      ctx.beginPath();
      ctx.moveTo(path.from.x, path.from.y);
      ctx.lineTo(path.to.x, path.to.y);
      ctx.stroke();
    }

    for (const clearing of state.clearings) {
      const gradient = ctx.createRadialGradient(
        clearing.center.x,
        clearing.center.y,
        clearing.radius * 0.3,
        clearing.center.x,
        clearing.center.y,
        clearing.radius + clearing.softness
      );
      gradient.addColorStop(0, 'rgba(90,110,60,0.5)');
      gradient.addColorStop(1, 'rgba(30,40,20,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(clearing.center.x, clearing.center.y, clearing.radius + clearing.softness, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawResourceNode(node: any): void {
    const ctx = this.ctx;
    const depletion = node.remainingResources / node.maxResources;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(node.position.x, node.position.y + node.size * 0.5, node.size * 0.9, node.size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Resource base (darker)
    const baseColor = node.type === 'tree' ? '#1a5f1a' : '#555';
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(node.position.x, node.position.y, node.size, 0, Math.PI * 2);
    ctx.fill();

    // Highlight (lighter, 2.5D effect)
    const highlightColor = node.type === 'tree' ? '#2d8f2d' : '#777';
    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(node.position.x - node.size * 0.2, node.position.y - node.size * 0.2, node.size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.fillStyle = '#fff';
    ctx.font = `${node.size * 1.2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = node.type === 'tree' ? '🌲' : '⛰️';
    ctx.fillText(icon, node.position.x, node.position.y - node.size * 0.3);

    // Resource amount bar
    if (depletion < 1) {
      const barWidth = node.size * 2;
      const barY = node.position.y + node.size + 5;

      ctx.fillStyle = '#000';
      ctx.fillRect(node.position.x - barWidth / 2, barY, barWidth, 4);

      ctx.fillStyle = node.type === 'tree' ? '#0f0' : '#888';
      ctx.fillRect(node.position.x - barWidth / 2, barY, barWidth * depletion, 4);
    }
  }

  private drawBuilding(building: Building, state: GameState, isCore: boolean): void {
    const ctx = this.ctx;
    const def = buildingDefs[building.defId];
    const selected = state.selectedBuilding?.id === building.id;
    const hpPercent = building.hp / building.maxHp;

    // Shadow (elliptical)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(building.position.x, building.position.y + def.radius * 0.7, def.radius * 1.1, def.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Selection circle
    if (selected) {
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(building.position.x, building.position.y, def.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Building base (3D effect with gradient)
    const gradient = ctx.createRadialGradient(
      building.position.x - def.radius * 0.3,
      building.position.y - def.radius * 0.3,
      0,
      building.position.x,
      building.position.y,
      def.radius
    );

    if (isCore) {
      gradient.addColorStop(0, '#ff9933');
      gradient.addColorStop(1, '#cc6600');
    } else {
      gradient.addColorStop(0, '#666');
      gradient.addColorStop(1, '#333');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(building.position.x, building.position.y, def.radius, 0, Math.PI * 2);
    ctx.fill();

    // Building outline
    ctx.strokeStyle = hpPercent < 0.3 ? '#f00' : '#000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Icon (larger, with shadow)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#fff';
    ctx.font = `${def.radius * 1.2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, building.position.x, building.position.y - def.radius * 0.2);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // HP bar (2.5D style)
    const barWidth = def.radius * 2.2;
    const barY = building.position.y - def.radius - 15;

    ctx.fillStyle = '#000';
    ctx.fillRect(building.position.x - barWidth / 2, barY, barWidth, 8);

    ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : (hpPercent > 0.25 ? '#ff0' : '#f00');
    ctx.fillRect(building.position.x - barWidth / 2, barY, barWidth * hpPercent, 8);

    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(building.position.x - barWidth / 2, barY, barWidth, 8);

    // Socket indicators (2.5D gems)
    for (let i = 0; i < 2; i++) {
      const socketX = building.position.x - 20 + i * 40;
      const socketY = building.position.y + def.radius + 12;

      const filled = building.sockets[i] !== null;

      // Gem base
      ctx.fillStyle = filled ? '#ffd700' : '#222';
      ctx.beginPath();
      ctx.arc(socketX, socketY, 10, 0, Math.PI * 2);
      ctx.fill();

      // Gem highlight
      if (filled) {
        ctx.fillStyle = '#ffee88';
        ctx.beginPath();
        ctx.arc(socketX - 3, socketY - 3, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(socketX, socketY, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const def = enemyDefs[enemy.defId];

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(enemy.position.x, enemy.position.y + def.size * 0.5, def.size * 0.8, def.size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Enemy body (with gradient for 3D effect)
    const gradient = ctx.createRadialGradient(
      enemy.position.x - def.size * 0.3,
      enemy.position.y - def.size * 0.3,
      0,
      enemy.position.x,
      enemy.position.y,
      def.size
    );
    gradient.addColorStop(0, this.lightenColor(def.color, 30));
    gradient.addColorStop(1, def.color);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(enemy.position.x, enemy.position.y, def.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Status effects
    let statusY = enemy.position.y - def.size - 10;
    for (const status of enemy.statuses) {
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';

      const icon = status.id === 'poison' ? '🧪' : status.id === 'slow' ? '❄️' : '?';
      ctx.fillText(icon, enemy.position.x, statusY);
      statusY -= 14;
    }

    // HP bar
    const barWidth = def.size * 2.5;
    const hpPercent = enemy.hp / enemy.maxHp;

    ctx.fillStyle = '#000';
    ctx.fillRect(enemy.position.x - barWidth / 2, enemy.position.y + def.size + 3, barWidth, 6);

    ctx.fillStyle = '#f00';
    ctx.fillRect(enemy.position.x - barWidth / 2, enemy.position.y + def.size + 3, barWidth * hpPercent, 6);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(enemy.position.x - barWidth / 2, enemy.position.y + def.size + 3, barWidth, 6);
  }

  private drawAllyUnit(unit: AllyUnit, _state: GameState): void {
    const ctx = this.ctx;
    const unitDef = unitDefs[unit.defId];

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(unit.position.x, unit.position.y + unit.size * 0.5, unit.size * 0.8, unit.size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Unit body (gradient for 3D)
    const gradient = ctx.createRadialGradient(
      unit.position.x - unit.size * 0.3,
      unit.position.y - unit.size * 0.3,
      0,
      unit.position.x,
      unit.position.y,
      unit.size
    );
    gradient.addColorStop(0, this.lightenColor(unitDef.color, 40));
    gradient.addColorStop(1, unitDef.color);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(unit.position.x, unit.position.y, unit.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Role indicator icon
    let roleIcon = '👤';
    if (unit.role === 'worker') roleIcon = '⚒️';
    else if (unit.role === 'support') roleIcon = '✨';

    ctx.fillStyle = '#fff';
    ctx.font = `${unit.size * 1.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roleIcon, unit.position.x, unit.position.y);

    // Carrying resources indicator
    if (unit.gathering && unit.gathering.amount > 0) {
      const resourceIcon = unit.gathering.resourceType === 'wood' ? '🌲' : '⛰️';
      ctx.font = '12px sans-serif';
      ctx.fillText(resourceIcon, unit.position.x, unit.position.y - unit.size - 8);
    }

    // HP bar
    const barWidth = unit.size * 3;
    const hpPercent = unit.hp / unit.maxHp;

    ctx.fillStyle = '#000';
    ctx.fillRect(unit.position.x - barWidth / 2, unit.position.y + unit.size + 2, barWidth, 5);

    ctx.fillStyle = '#0f0';
    ctx.fillRect(unit.position.x - barWidth / 2, unit.position.y + unit.size + 2, barWidth * hpPercent, 5);
  }

  private drawProjectile(position: Vec2): void {
    const ctx = this.ctx;

    // Projectile glow
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 8;

    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawLootDrop(position: Vec2): void {
    const ctx = this.ctx;

    // Glow effect
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15;

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Gem shine
    ctx.fillStyle = '#ffee88';
    ctx.beginPath();
    ctx.arc(position.x - 3, position.y - 3, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💎', position.x, position.y + 6);
  }

  private drawBuildMenuIndicator(position: Vec2): void {
    const ctx = this.ctx;

    // Pulsing circle
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;

    ctx.strokeStyle = `rgba(68, 136, 255, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(position.x, position.y, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(68, 136, 255, 0.2)`;
    ctx.beginPath();
    ctx.arc(position.x, position.y, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGameOver(state: GameState): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#f00';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOWN HALL DESTROYED', this.canvas.width / 2, this.canvas.height / 2);

    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.fillText(`Survived ${state.waveNumber} waves`, this.canvas.width / 2, this.canvas.height / 2 + 60);
  }

  private lightenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  screenToWorld(screenPos: Vec2, camera: Vec2): Vec2 {
    return {
      x: screenPos.x + camera.x,
      y: screenPos.y + camera.y
    };
  }
}
