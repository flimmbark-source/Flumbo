import { Building, BuildingDef, Item, ItemDef } from './types';
import { buildingDefs, getBuildingsByCategory } from './data/buildings';
import { itemDefs } from './data/items';
import { GameEngine } from './GameEngine';

/**
 * RTS-style UI with click-to-build menu
 */
export class UI {
  private container: HTMLElement;
  private engine: GameEngine;
  private tooltipEl: HTMLElement | null = null;
  private activeTooltipTargetId: string | null = null;

  constructor(container: HTMLElement, engine: GameEngine) {
    this.container = container;
    this.engine = engine;
    this.render();
  }

  render(): void {
    const state = this.engine.state;
    const workerEmitter = state.townCore.emitters.find(e => e.id === 'spawn_worker');
    const workerElapsed = workerEmitter ? Math.max(0, state.time - workerEmitter.lastTrigger) : 0;
    const workerProgress = workerEmitter && !state.awaitingTownPlacement
      ? Math.min(workerElapsed / workerEmitter.everySec, 1)
      : 0;
    const workerEta = workerEmitter ? Math.max(0, workerEmitter.everySec - workerElapsed) : 0;

    this.container.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">

        <!-- Top HUD -->
        <div style="position: absolute; top: 8px; left: 8px; right: 8px; display: flex; justify-content: space-between; gap: 8px; pointer-events: auto;">

          <!-- Resources -->
          <div style="background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(40,40,40,0.9)); padding: 12px 20px; border-radius: 8px; border: 2px solid #444; display: flex; gap: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🌲</span>
              <span style="font-weight: bold; font-size: 18px; color: #0f0;">${Math.floor(state.resources.wood)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⛰️</span>
              <span style="font-weight: bold; font-size: 18px; color: #888;">${Math.floor(state.resources.ore)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">💰</span>
              <span style="font-weight: bold; font-size: 18px; color: #ffd700;">${Math.floor(state.resources.gold)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">👥</span>
              <span style="font-weight: bold; font-size: 18px; color: ${state.population >= state.populationCap ? '#f66' : '#9fd0ff'};">
                ${state.population} / ${state.populationCap}
              </span>
            </div>
          </div>

          <!-- Phase Timer -->
          <div style="background: linear-gradient(135deg, ${state.awaitingTownPlacement ? 'rgba(80,160,255,0.25)' : state.phase === 'DAY' ? 'rgba(255,200,0,0.2)' : 'rgba(100,100,255,0.2)'}, rgba(0,0,0,0.9)); padding: 12px 20px; border-radius: 8px; border: 2px solid ${state.awaitingTownPlacement ? '#66b5ff' : state.phase === 'DAY' ? '#ffd700' : '#4488ff'}; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="font-size: 22px; font-weight: bold; color: ${state.awaitingTownPlacement ? '#9fd0ff' : state.phase === 'DAY' ? '#ffd700' : '#88aaff'}; text-align: center;">
              ${state.awaitingTownPlacement ? '⏳ PLACEMENT' : state.phase === 'DAY' ? '☀️ DAY' : '🌙 NIGHT'}
            </div>
            <div style="font-size: 16px; text-align: center; margin-top: 4px; color: #fff;">
              ${state.awaitingTownPlacement ? 'Click to place your Town Hall' : `${Math.ceil(state.phaseTimer)}s`}
            </div>
            ${state.awaitingTownPlacement
              ? `<div style=\"font-size: 13px; text-align: center; margin-top: 6px; color: #b5d8ff;\">Timer starts after placement</div>`
              : state.phase === 'NIGHT' ? `<div style=\"font-size: 14px; text-align: center; margin-top: 4px; color: #f88;\">Wave ${state.waveNumber}</div>`
              : ''}
            ${!state.awaitingTownPlacement && state.phase === 'DAY' ? `
              <button
                data-start-wave="true"
                style="
                  width: 100%;
                  margin-top: 8px;
                  padding: 8px 16px;
                  background: linear-gradient(135deg, #f44, #c22);
                  color: #fff;
                  border: 2px solid #a00;
                  border-radius: 6px;
                  cursor: pointer;
                  font-weight: bold;
                  font-size: 14px;
                  transition: all 0.2s;
                  box-shadow: 0 2px 8px rgba(255,0,0,0.3);
                "
                onmouseover="this.style.background='linear-gradient(135deg, #f66, #d33)'; this.style.transform='scale(1.05)';"
                onmouseout="this.style.background='linear-gradient(135deg, #f44, #c22)'; this.style.transform='scale(1)';"
              >
                ⚔️ GO!
              </button>
            ` : ''}
          </div>

          <!-- Town Hall HP -->
          <div style="background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(40,40,40,0.9)); padding: 12px 20px; border-radius: 8px; border: 2px solid #444; min-width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 6px;">🏛️ Town Hall</div>
            <div style="background: #222; height: 24px; border-radius: 4px; overflow: hidden; border: 2px solid #000;">
              <div style="background: linear-gradient(90deg, ${state.townCore.hp > 1000 ? '#0f0' : state.townCore.hp > 500 ? '#ff0' : '#f00'}, ${state.townCore.hp > 1000 ? '#0a0' : state.townCore.hp > 500 ? '#cc0' : '#a00'}); height: 100%; width: ${(state.townCore.hp / state.townCore.maxHp) * 100}%;"></div>
            </div>
            <div style="font-size: 13px; margin-top: 4px; text-align: center; color: #aaa;">${Math.ceil(state.townCore.hp)} / ${state.townCore.maxHp}</div>
            <div style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9fd0ff; font-weight: bold;">
                <span>Next worker</span>
                <span>${workerEta.toFixed(1)}s</span>
              </div>
              <div style="background: #111; height: 10px; border-radius: 6px; overflow: hidden; border: 1px solid #334;">
                <div style="background: linear-gradient(90deg, #4da3ff, #66d0ff); height: 100%; width: ${workerProgress * 100}%; transition: width 0.2s;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Click-to-Build Menu -->
        ${state.buildMenuPosition ? this.renderBuildMenu() : ''}

        <!-- Selected Building Panel -->
        ${state.selectedBuilding ? this.renderBuildingPanel(state.selectedBuilding) : ''}

        ${state.awaitingTownPlacement ? `
          <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); padding: 16px 20px; border-radius: 10px; border: 2px solid #66b5ff; pointer-events: none; max-width: 420px; text-align: center; box-shadow: 0 6px 20px rgba(0,0,0,0.6);">
            <div style="font-size: 22px; font-weight: bold; color: #9fd0ff; margin-bottom: 8px;">Place your Town Hall to begin</div>
            <div style="font-size: 14px; color: #e5f2ff; line-height: 1.4;">
              Find a meadow or a path intersection to claim as your base. The giant forest stays still until you pick a spot, and then the day timer starts counting down.
            </div>
          </div>
        ` : ''}

        <!-- Inventory (Bottom Left) -->
        <div style="position: absolute; bottom: 8px; left: 8px; max-width: 500px; background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(30,30,30,0.95)); padding: 12px; border-radius: 8px; border: 2px solid #444; pointer-events: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #ffd700;">💎 Inventory (${state.inventory.length})</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 120px; overflow-y: auto;">
            ${state.inventory.map(item => this.renderInventoryItem(item)).join('')}
            ${state.inventory.length === 0 ? '<div style="color: #666; font-size: 13px;">Kill enemies at night for loot!</div>' : ''}
          </div>
        </div>

        <!-- Controls Help (Bottom Right) -->
        <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.85); padding: 10px 14px; border-radius: 6px; border: 2px solid #333; font-size: 11px; pointer-events: auto; max-width: 200px;">
          <div style="font-weight: bold; margin-bottom: 4px; color: #ffd700;">⌨️ Controls</div>
          <div style="color: #aaa;">• Move mouse to edge → pan</div>
          <div style="color: #aaa;">• Click ground → build menu</div>
          <div style="color: #aaa;">• Click building → select</div>
          <div style="color: #aaa;">• Drag items → socket</div>
        </div>
      </div>
    `;

    if (this.activeTooltipTargetId) {
      const activeTarget = this.container.querySelector(`[data-tooltip-id="${this.activeTooltipTargetId}"]`);
      if (!activeTarget) {
        this.hideTooltip();
      }
    }

    this.attachEventListeners();
  }

  private renderBuildMenu(): string {
    const state = this.engine.state;
    if (!state.buildMenuPosition) return '';

    const screenPos = {
      x: state.buildMenuPosition.x - state.camera.x,
      y: state.buildMenuPosition.y - state.camera.y
    };

    const categories = [
      { name: 'Production', cat: 'production', icon: '⚔️' },
      { name: 'Military', cat: 'military', icon: '🗼' },
      { name: 'Resource', cat: 'resource', icon: '📦' },
      { name: 'Tech', cat: 'tech', icon: '🔬' }
    ];

    return `
      <div style="position: absolute; left: ${screenPos.x}px; top: ${screenPos.y}px; transform: translate(-50%, -50%); pointer-events: auto;">
        <div style="background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(40,40,60,0.95)); padding: 12px; border-radius: 10px; border: 3px solid #4488ff; box-shadow: 0 8px 24px rgba(0,0,0,0.8); min-width: 260px;">
          <div style="font-size: 15px; font-weight: bold; margin-bottom: 10px; text-align: center; color: #4488ff;">🏗️ Build Menu</div>

          ${categories.map(({ name, cat, icon }) => {
            const buildings = getBuildingsByCategory(cat);
            if (buildings.length === 0) return '';

            return `
              <div style="margin-bottom: 10px;">
                <div style="font-size: 12px; font-weight: bold; color: #888; margin-bottom: 4px;">${icon} ${name}</div>
                <div style="display: grid; grid-template-columns: repeat(4, 52px); gap: 6px;">
                  ${buildings.map(def => {
                    const canAfford = this.engine.canAfford(def.cost);
                    const tooltipCost = `${def.cost.wood ? `🌲${def.cost.wood} ` : ''}${def.cost.ore ? `⛰️${def.cost.ore} ` : ''}${def.cost.gold ? `💰${def.cost.gold}` : ''}`.trim();
                    return `
                      <button
                        data-build="${def.id}"
                        data-tooltip-id="build-${def.id}"
                        data-build-name="${def.name}"
                        data-build-desc="${def.description}"
                        data-build-cost="${tooltipCost || 'Free'}"
                        data-build-pop="${def.populationBonus || 0}"
                        style="
                          width: 52px;
                          height: 52px;
                          background: ${canAfford ? 'linear-gradient(135deg, #333, #222)' : '#181818'};
                          color: ${canAfford ? '#fff' : '#555'};
                          border: 2px solid ${canAfford ? '#666' : '#333'};
                          border-radius: 8px;
                          cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                          font-size: 22px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          transition: all 0.15s ease;
                          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                        "
                        ${!canAfford ? 'disabled' : ''}
                        onmouseover="if(!this.disabled) { this.style.transform='translateY(-2px)'; this.style.borderColor='#88aaff'; }"
                        onmouseout="if(!this.disabled) { this.style.transform='translateY(0)'; this.style.borderColor='${canAfford ? '#666' : '#333'}'; }"
                      >
                        ${def.icon}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}

          <button
            data-close-menu="true"
            style="
              width: 100%;
              padding: 8px;
              background: #f44;
              color: #fff;
              border: 2px solid #a22;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              margin-top: 8px;
            "
          >
            ✕ Close
          </button>
        </div>
      </div>
    `;
  }

  private renderBuildingPanel(building: Building): string {
    const def = buildingDefs[building.defId];

    return `
      <div style="position: absolute; top: 120px; right: 8px; width: 320px; background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(30,30,50,0.95)); padding: 16px; border-radius: 8px; border: 2px solid #4488ff; pointer-events: auto; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 28px; margin-bottom: 4px;">${def.icon} ${def.name}</div>
            <div style="font-size: 12px; color: #888;">${def.description}</div>
          </div>
          <button
            data-deselect="true"
            style="background: #f44; border: none; color: #fff; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;"
          >
            ✕
          </button>
        </div>

        <!-- HP Bar -->
        <div style="margin-top: 12px;">
          <div style="background: #222; height: 20px; border-radius: 4px; overflow: hidden; border: 2px solid #000;">
            <div style="background: linear-gradient(90deg, ${building.hp > building.maxHp * 0.5 ? '#0f0' : '#f00'}, ${building.hp > building.maxHp * 0.5 ? '#0a0' : '#a00'}); height: 100%; width: ${(building.hp / building.maxHp) * 100}%;"></div>
          </div>
          <div style="font-size: 12px; margin-top: 4px; text-align: center; color: #aaa;">${Math.ceil(building.hp)} / ${building.maxHp} HP</div>
        </div>

        <!-- Item Sockets -->
        <div style="margin-top: 16px;">
          <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px; color: #ffd700;">💎 Item Sockets</div>
          ${this.renderSockets(building)}
        </div>

        <!-- Stats -->
        <div style="margin-top: 12px; font-size: 11px; color: #666; padding-top: 12px; border-top: 1px solid #333;">
          Active Emitters: ${building.emitters.length} | Socketed Items: ${building.sockets.filter(s => s).length}/2
        </div>
      </div>
    `;
  }

  private renderSockets(building: Building): string {
    return building.sockets.map((socket, index) => {
      if (socket) {
        const def = itemDefs[socket.defId];
        const rarityColors: Record<string, string> = {
          common: '#fff',
          uncommon: '#0f0',
          rare: '#4af',
          epic: '#a0f'
        };

        return `
          <div
            data-socket="${index}"
            data-building-id="${building.id}"
            data-item-name="${def.name}"
            data-item-desc="${def.description}"
            data-item-icon="${def.icon}"
            data-item-rarity="${def.rarity}"
            style="
              background: linear-gradient(135deg, #222, #111);
              border: 2px solid ${rarityColors[def.rarity]};
              border-radius: 6px;
              padding: 10px;
              margin-bottom: 8px;
              position: relative;
            "
          >
            <button
              data-unsocket="${index}"
              data-building-id="${building.id}"
              style="
                position: absolute;
                top: 6px;
                right: 6px;
                background: #f44;
                border: none;
                color: #fff;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                line-height: 1;
              "
            >
              ✕
            </button>
            <div style="display: flex; align-items: center; gap: 12px; padding-right: 30px;">
              <div style="font-size: 36px;">${def.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: bold; color: ${rarityColors[def.rarity]}; font-size: 14px;">${def.name}</div>
                <div style="font-size: 11px; color: #aaa; margin-top: 3px;">${def.description}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div
            data-socket="${index}"
            data-building-id="${building.id}"
            style="
              background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
              border: 2px dashed #444;
              border-radius: 6px;
              padding: 24px;
              margin-bottom: 8px;
              text-align: center;
              color: #666;
              font-size: 13px;
            "
          >
            Empty Socket<br/>
            <span style="font-size: 11px; color: #555;">Drag item here</span>
          </div>
        `;
      }
    }).join('');
  }

  private renderInventoryItem(item: Item): string {
    const def = itemDefs[item.defId];
    if (!def) return '';

    const rarityColors: Record<string, string> = {
      common: '#fff',
      uncommon: '#0f0',
      rare: '#4af',
      epic: '#a0f'
    };

    return `
      <div
        data-item-id="${item.id}"
        data-item-def-id="${def.id}"
        data-tooltip-id="item-${item.id}"
        draggable="true"
        style="
          background: linear-gradient(135deg, #222, #111);
          border: 2px solid ${rarityColors[def.rarity]};
          border-radius: 6px;
          padding: 8px;
          cursor: grab;
          min-width: 90px;
          text-align: center;
          transition: transform 0.2s;
        "
        onmouseover="this.style.transform='scale(1.05)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <div style="font-size: 28px; margin-bottom: 4px;">${def.icon}</div>
        <div style="font-size: 11px; font-weight: bold; color: ${rarityColors[def.rarity]}; line-height: 1.2;">
          ${def.name}
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Start wave button
    const startWaveBtn = this.container.querySelector('[data-start-wave]');
    if (startWaveBtn) {
      startWaveBtn.addEventListener('click', () => {
        this.engine.startWaveEarly();
        this.render();
      });
    }

    // Build buttons
    const buildButtons = this.container.querySelectorAll('[data-build]');
    buildButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const defId = btn.getAttribute('data-build');
        if (defId) {
          const def = buildingDefs[defId];
          this.engine.state.buildMode = def;
          this.engine.state.buildMenuPosition = null;
          this.render();
        }
      });

      btn.addEventListener('mouseenter', () => {
        const defId = btn.getAttribute('data-build');
        const tooltipId = btn.getAttribute('data-tooltip-id');
        if (defId && tooltipId) {
          const def = buildingDefs[defId];
          if (def) {
            this.showTooltip(btn as HTMLElement, this.renderBuildingTooltip(def), tooltipId);
          }
        }
      });

      btn.addEventListener('mouseleave', () => this.hideTooltip());
    });

    // Close build menu
    const closeBtn = this.container.querySelector('[data-close-menu]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.engine.state.buildMenuPosition = null;
        this.render();
      });
    }

    // Deselect button
    const deselectBtn = this.container.querySelector('[data-deselect]');
    if (deselectBtn) {
      deselectBtn.addEventListener('click', () => {
        this.engine.state.selectedBuilding = null;
        this.render();
      });
    }

    // Unsocket buttons
    const unsocketButtons = this.container.querySelectorAll('[data-unsocket]');
    unsocketButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const socketIndex = parseInt(btn.getAttribute('data-unsocket') || '0');
        const buildingId = btn.getAttribute('data-building-id');

        if (buildingId) {
          const building = this.findBuilding(buildingId);
          if (building) {
            this.engine.socketItem(building, socketIndex, null);
            this.render();
          }
        }
      });
    });

    // Drag and drop for items
    const items = this.container.querySelectorAll('[data-item-id]');
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        const itemId = item.getAttribute('data-item-id');
        if (itemId && e instanceof DragEvent && e.dataTransfer) {
          e.dataTransfer.setData('text/plain', itemId);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.dropEffect = 'move';
        }
      });

      item.addEventListener('mouseenter', () => {
        const defId = item.getAttribute('data-item-def-id');
        const tooltipId = item.getAttribute('data-tooltip-id');
        if (!defId || !tooltipId) return;
        const def = itemDefs[defId];
        if (!def) return;
        this.showTooltip(item as HTMLElement, this.renderInventoryTooltip(def), tooltipId);
      });

      item.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });

    const sockets = this.container.querySelectorAll('[data-socket]');
    sockets.forEach(socket => {
      socket.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e instanceof DragEvent && e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      });

      socket.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!(e instanceof DragEvent) || !e.dataTransfer) return;

        const itemId = e.dataTransfer.getData('text/plain');
        const socketIndex = parseInt(socket.getAttribute('data-socket') || '0');
        const buildingId = socket.getAttribute('data-building-id');

        if (itemId && buildingId) {
          const building = this.findBuilding(buildingId);
          if (building) {
            this.engine.socketItem(building, socketIndex, itemId);
            this.render();
          }
        }
      });
    });
  }

  private findBuilding(id: string): Building | null {
    if (this.engine.state.townCore.id === id) {
      return this.engine.state.townCore;
    }
    return this.engine.state.buildings.find(b => b.id === id) || null;
  }

  private ensureTooltipElement(): HTMLElement {
    if (!this.tooltipEl) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '2000';
      el.style.maxWidth = '260px';
      el.style.padding = '10px 12px';
      el.style.borderRadius = '8px';
      el.style.border = '2px solid #555';
      el.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.95), rgba(20,20,20,0.95))';
      el.style.color = '#fff';
      el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.6)';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-4px)';
      el.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
      el.style.display = 'none';
      document.body.appendChild(el);
      this.tooltipEl = el;
    }

    return this.tooltipEl;
  }

  private renderInventoryTooltip(itemDef: ItemDef): string {
    const rarityColors: Record<string, string> = {
      common: '#fff',
      uncommon: '#0f0',
      rare: '#4af',
      epic: '#a0f'
    };

    return `
      <div style="display: flex; gap: 10px; align-items: center;">
        <div style="font-size: 30px;">${itemDef.icon}</div>
        <div>
          <div style="font-weight: bold; color: ${rarityColors[itemDef.rarity]}; font-size: 14px;">${itemDef.name}</div>
          <div style="font-size: 12px; color: #ccc;">${itemDef.description}</div>
        </div>
      </div>
    `;
  }

  private renderBuildingTooltip(def: BuildingDef): string {
    const costParts = [
      def.cost.wood ? `🌲${def.cost.wood}` : '',
      def.cost.ore ? `⛰️${def.cost.ore}` : '',
      def.cost.gold ? `💰${def.cost.gold}` : ''
    ].filter(Boolean).join(' ');
    const popLine = def.populationBonus
      ? `<div style="font-size: 11px; color: #8df; margin-top: 4px;">+${def.populationBonus} max population</div>`
      : '';

    return `
      <div style="display: flex; gap: 10px; align-items: flex-start;">
        <div style="font-size: 26px;">${def.icon}</div>
        <div>
          <div style="font-weight: bold; font-size: 14px; color: #9fd0ff;">${def.name}</div>
          <div style="font-size: 12px; color: #ccc; margin-top: 2px;">${def.description}</div>
          <div style="font-size: 11px; color: #aaa; margin-top: 6px;">Cost: ${costParts || 'Free'}</div>
          ${popLine}
        </div>
      </div>
    `;
  }

  private showTooltip(target: HTMLElement, content: string, tooltipId: string): void {
    this.activeTooltipTargetId = tooltipId;
    const tooltip = this.ensureTooltipElement();
    tooltip.innerHTML = content;

    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '0';

    const rect = target.getBoundingClientRect();
    const desiredLeft = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
    const desiredTop = rect.top - tooltip.offsetHeight - 10;

    const clampedLeft = Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, desiredLeft));
    const clampedTop = Math.max(8, desiredTop);

    tooltip.style.left = `${clampedLeft}px`;
    tooltip.style.top = `${clampedTop}px`;
    tooltip.style.visibility = 'visible';
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });
  }

  private hideTooltip(): void {
    this.activeTooltipTargetId = null;
    if (this.tooltipEl) {
      this.tooltipEl.style.opacity = '0';
      this.tooltipEl.style.transform = 'translateY(-4px)';
      this.tooltipEl.style.display = 'none';
    }
  }
}
