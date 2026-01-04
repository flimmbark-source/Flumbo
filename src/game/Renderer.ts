import { GameState, Building, Enemy, Vec2 } from './types';
import { buildingDefs } from './data/buildings';
import { enemyDefs } from './data/enemies';

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

    // Clear
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw ground grid
    this.drawGrid(state);

    // Draw resource nodes
    for (const node of state.resourceNodes) {
      ctx.fillStyle = node.type === 'tree' ? '#1a5f1a' : '#555';
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, node.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `${node.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.type === 'tree' ? '🌲' : '⛰️', node.position.x, node.position.y);
    }

    // Draw buildings
    this.drawBuilding(state.townCore, state, true);
    for (const building of state.buildings) {
      this.drawBuilding(building, state, false);
    }

    // Draw enemies
    for (const enemy of state.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw ally units
    for (const unit of state.allyUnits) {
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.arc(unit.position.x, unit.position.y, unit.size, 0, Math.PI * 2);
      ctx.fill();

      // HP bar
      const barWidth = 20;
      const hpPercent = unit.hp / unit.maxHp;
      ctx.fillStyle = '#000';
      ctx.fillRect(unit.position.x - barWidth / 2, unit.position.y - 15, barWidth, 3);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(unit.position.x - barWidth / 2, unit.position.y - 15, barWidth * hpPercent, 3);
    }

    // Draw projectiles
    for (const proj of state.projectiles) {
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(proj.position.x, proj.position.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw loot drops
    for (const drop of state.lootDrops) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(drop.position.x, drop.position.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💎', drop.position.x, drop.position.y + 5);
    }

    // Draw placement preview
    if (state.buildMode && state.selectedBuilding === null) {
      // This will be drawn by UI interaction
    }

    ctx.restore();

    // Draw game over
    if (state.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.fillStyle = '#f00';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TOWN CORE DESTROYED', this.canvas.width / 2, this.canvas.height / 2);

      ctx.fillStyle = '#fff';
      ctx.font = '24px sans-serif';
      ctx.fillText(`Survived ${state.waveNumber} waves`, this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
  }

  private drawGrid(state: GameState): void {
    const ctx = this.ctx;
    const gridSize = 100;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    for (let x = 0; x < state.worldSize.x; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.worldSize.y);
      ctx.stroke();
    }

    for (let y = 0; y < state.worldSize.y; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.worldSize.x, y);
      ctx.stroke();
    }
  }

  private drawBuilding(building: Building, state: GameState, isCore: boolean): void {
    const ctx = this.ctx;
    const def = buildingDefs[building.defId];
    const selected = state.selectedBuilding?.id === building.id;

    // Range circle
    if (selected) {
      ctx.strokeStyle = '#4488ff66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(building.position.x, building.position.y, 200, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Building circle
    const hpPercent = building.hp / building.maxHp;
    ctx.fillStyle = isCore ? '#ff8800' : (selected ? '#6688ff' : '#4a4a4a');
    ctx.strokeStyle = hpPercent < 0.3 ? '#f00' : '#888';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(building.position.x, building.position.y, def.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Icon
    ctx.fillStyle = '#fff';
    ctx.font = `${def.radius}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, building.position.x, building.position.y);

    // HP bar
    const barWidth = def.radius * 2;
    const barY = building.position.y + def.radius + 10;

    ctx.fillStyle = '#000';
    ctx.fillRect(building.position.x - barWidth / 2, barY, barWidth, 6);

    ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : (hpPercent > 0.25 ? '#ff0' : '#f00');
    ctx.fillRect(building.position.x - barWidth / 2, barY, barWidth * hpPercent, 6);

    // Socket indicators
    for (let i = 0; i < 2; i++) {
      const socketX = building.position.x - 15 + i * 30;
      const socketY = building.position.y - def.radius - 15;

      ctx.fillStyle = building.sockets[i] ? '#ffd700' : '#333';
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(socketX, socketY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const def = enemyDefs[enemy.defId];

    // Enemy body
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(enemy.position.x, enemy.position.y, def.size, 0, Math.PI * 2);
    ctx.fill();

    // Status effects
    let statusY = enemy.position.y - def.size - 5;
    for (const status of enemy.statuses) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';

      const icon = status.id === 'poison' ? '🧪' : status.id === 'slow' ? '❄️' : '?';
      ctx.fillText(icon, enemy.position.x, statusY);
      statusY -= 12;
    }

    // HP bar
    const barWidth = def.size * 2;
    const hpPercent = enemy.hp / enemy.maxHp;

    ctx.fillStyle = '#000';
    ctx.fillRect(enemy.position.x - barWidth / 2, enemy.position.y + def.size + 2, barWidth, 4);

    ctx.fillStyle = '#f00';
    ctx.fillRect(enemy.position.x - barWidth / 2, enemy.position.y + def.size + 2, barWidth * hpPercent, 4);
  }

  screenToWorld(screenPos: Vec2, camera: Vec2): Vec2 {
    return {
      x: screenPos.x + camera.x,
      y: screenPos.y + camera.y
    };
  }
}
