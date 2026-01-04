import { GameEngine } from './game/GameEngine';
import { Renderer } from './game/Renderer';
import { UI } from './game/UI';
import { Vec2 } from './game/types';
import { buildingDefs } from './game/data/buildings';

class Game {
  private engine: GameEngine;
  private renderer: Renderer;
  private ui: UI;
  private canvas!: HTMLCanvasElement;
  private uiContainer!: HTMLElement;
  private lastTime = 0;
  private animationId: number | null = null;

  private keys = new Set<string>();
  private mousePos: Vec2 = { x: 0, y: 0 };
  private placementPreview: Vec2 | null = null;
  private cameraMovement: Vec2 = { x: 0, y: 0 };

  constructor() {
    this.engine = new GameEngine();
    this.setupDOM();
    this.renderer = new Renderer(this.canvas);
    this.ui = new UI(this.uiContainer, this.engine);

    // Center camera on town core (after engine is initialized)
    this.engine.state.camera = {
      x: this.engine.state.worldSize.x / 2 - this.canvas.width / 2,
      y: this.engine.state.worldSize.y / 2 - this.canvas.height / 2
    };

    this.setupInputHandlers();
    this.start();
  }

  private setupDOM(): void {
    const app = document.getElementById('app')!;

    app.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%;">
        <canvas id="gameCanvas" style="display: block; width: 100%; height: 100%;"></canvas>
        <div id="uiContainer" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;"></div>
      </div>
    `;

    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.uiContainer = document.getElementById('uiContainer')!;
    this.uiContainer.style.pointerEvents = 'none';

    // Set canvas size
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Handle resize
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }

  private setupInputHandlers(): void {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // Mouse move
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // Update placement preview
      if (this.engine.state.awaitingTownPlacement) {
        this.placementPreview = this.renderer.screenToWorld(this.mousePos, this.engine.state.camera);
      } else if (this.engine.state.buildMode && this.engine.state.phase === 'DAY') {
        this.placementPreview = this.renderer.screenToWorld(this.mousePos, this.engine.state.camera);
      } else {
        this.placementPreview = null;
      }
    });

    // Mouse click
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const screenPos: Vec2 = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      const worldPos = this.renderer.screenToWorld(screenPos, this.engine.state.camera);

      this.handleClick(worldPos);
    });
  }

  private handleClick(worldPos: Vec2): void {
    const state = this.engine.state;

    if (state.awaitingTownPlacement) {
      const placed = this.engine.placeTownCore(worldPos);
      if (placed) {
        this.centerCameraOn(worldPos);
        this.placementPreview = null;
        this.ui.render();
      }
      return;
    }

    // Check loot pickup first
    for (const drop of state.lootDrops) {
      const dist = Math.sqrt(
        Math.pow(worldPos.x - drop.position.x, 2) +
        Math.pow(worldPos.y - drop.position.y, 2)
      );

      if (dist < 15) {
        this.engine.pickupLoot(drop.id);
        this.ui.render();
        return;
      }
    }

    // Check building selection
    const allBuildings = [state.townCore, ...state.buildings];
    for (const building of allBuildings) {
      const dist = Math.sqrt(
        Math.pow(worldPos.x - building.position.x, 2) +
        Math.pow(worldPos.y - building.position.y, 2)
      );

      if (dist < 50) {
        state.selectedBuilding = building;
        state.buildMode = null;
        state.buildMenuPosition = null;
        this.ui.render();
        return;
      }
    }

    // Place building if in build mode
    if (state.buildMode) {
      const success = this.engine.placeBuilding(state.buildMode.id, worldPos);
      if (success) {
        state.buildMode = null;
        state.buildMenuPosition = null;
        this.ui.render();
      }
      return;
    }

    // RTS-style: clicking empty ground shows build menu
    state.selectedBuilding = null;
    state.buildMenuPosition = { ...worldPos };
    this.ui.render();
  }

  private start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // No camera movement - map fits on screen
    this.cameraMovement = { x: 0, y: 0 };

    // Keep camera centered on the world
    this.engine.state.camera.x = Math.max(0, (this.engine.state.worldSize.x - this.canvas.width) / 2);
    this.engine.state.camera.y = Math.max(0, (this.engine.state.worldSize.y - this.canvas.height) / 2);

    // Update game
    this.engine.update(deltaTime);

    // Update UI on phase change or resource changes
    const phaseChanged = Math.floor(this.engine.state.phaseTimer) !== Math.floor(this.engine.state.phaseTimer - deltaTime);
    if (phaseChanged) {
      this.ui.render();
    }
  }

  private render(): void {
    this.renderer.render(this.engine.state);

    const ctx = this.canvas.getContext('2d')!;

    // Draw camera movement arrow
    if (this.cameraMovement.x !== 0 || this.cameraMovement.y !== 0) {
      const angle = Math.atan2(this.cameraMovement.y, this.cameraMovement.x);
      const arrowSize = 30;
      const cursorX = this.mousePos.x;
      const cursorY = this.mousePos.y;

      ctx.save();
      ctx.translate(cursorX, cursorY);
      ctx.rotate(angle);

      // Arrow shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Arrow fill
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(arrowSize, 0);
      ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.6);
      ctx.lineTo(-arrowSize * 0.3, 0);
      ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.6);
      ctx.closePath();
      ctx.fill();

      // Arrow outline
      ctx.strokeStyle = '#cc9900';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // Draw placement preview
    const placementDef = this.engine.state.awaitingTownPlacement
      ? buildingDefs.townHall
      : this.engine.state.buildMode;

    if (this.placementPreview && placementDef) {
      const camera = this.engine.state.camera;
      const def = placementDef;

      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      ctx.strokeStyle = '#4488ff88';
      ctx.fillStyle = '#4488ff22';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(this.placementPreview.x, this.placementPreview.y, def.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `${def.radius}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, this.placementPreview.x, this.placementPreview.y);

      ctx.restore();
    }
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private centerCameraOn(position: Vec2): void {
    this.engine.state.camera = {
      x: position.x - this.canvas.width / 2,
      y: position.y - this.canvas.height / 2
    };

    this.engine.state.camera.x = Math.max(0, Math.min(
      this.engine.state.worldSize.x - this.canvas.width,
      this.engine.state.camera.x
    ));
    this.engine.state.camera.y = Math.max(0, Math.min(
      this.engine.state.worldSize.y - this.canvas.height,
      this.engine.state.camera.y
    ));
  }
}

// Start the game
let game: Game | null = null;

function init() {
  if (game) {
    game.destroy();
  }
  game = new Game();
}

init();

// Hot module replacement for development
if ((import.meta as any).hot) {
  (import.meta as any).hot.accept(() => {
    init();
  });
}
