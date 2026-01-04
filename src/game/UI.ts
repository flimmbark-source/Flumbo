import { Building, Item } from './types';
import { buildingDefs } from './data/buildings';
import { itemDefs } from './data/items';
import { GameEngine } from './GameEngine';

export class UI {
  private container: HTMLElement;
  private engine: GameEngine;

  constructor(container: HTMLElement, engine: GameEngine) {
    this.container = container;
    this.engine = engine;
    this.render();
  }

  render(): void {
    const state = this.engine.state;

    this.container.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;">
        <!-- Top HUD -->
        <div style="position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; pointer-events: auto;">
          <div style="background: rgba(0,0,0,0.8); padding: 15px; border-radius: 8px; border: 2px solid #444;">
            <div style="font-size: 24px; font-weight: bold; color: ${state.phase === 'DAY' ? '#ffd700' : '#8888ff'};">
              ${state.phase === 'DAY' ? '☀️ DAY' : '🌙 NIGHT'}
            </div>
            <div style="font-size: 16px; margin-top: 5px;">
              ${Math.ceil(state.phaseTimer)}s remaining
            </div>
            ${state.phase === 'NIGHT' ? `<div style="font-size: 16px; margin-top: 5px; color: #f88;">Wave ${state.waveNumber}</div>` : ''}
          </div>

          <div style="background: rgba(0,0,0,0.8); padding: 15px; border-radius: 8px; border: 2px solid #444;">
            <div style="font-size: 18px; font-weight: bold;">Town Core</div>
            <div style="margin-top: 5px;">
              <div style="background: #333; height: 20px; width: 200px; border-radius: 4px; overflow: hidden;">
                <div style="background: ${state.townCore.hp > 500 ? '#0f0' : state.townCore.hp > 250 ? '#ff0' : '#f00'}; height: 100%; width: ${(state.townCore.hp / state.townCore.maxHp) * 100}%;"></div>
              </div>
              <div style="font-size: 14px; margin-top: 2px;">${Math.ceil(state.townCore.hp)} / ${state.townCore.maxHp}</div>
            </div>
          </div>
        </div>

        <!-- Build Menu (DAY only) -->
        ${state.phase === 'DAY' ? `
          <div style="position: absolute; top: 120px; left: 10px; background: rgba(0,0,0,0.8); padding: 15px; border-radius: 8px; border: 2px solid #444; pointer-events: auto;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Build</div>
            ${this.renderBuildButtons()}
          </div>
        ` : ''}

        <!-- Inventory -->
        <div style="position: absolute; bottom: 10px; left: 10px; max-width: 600px; background: rgba(0,0,0,0.8); padding: 15px; border-radius: 8px; border: 2px solid #444; pointer-events: auto;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Inventory (${state.inventory.length} items)</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; max-height: 150px; overflow-y: auto;">
            ${state.inventory.map(item => this.renderInventoryItem(item)).join('')}
            ${state.inventory.length === 0 ? '<div style="color: #888;">No items yet. Kill enemies at night!</div>' : ''}
          </div>
        </div>

        <!-- Selected Building Panel -->
        ${state.selectedBuilding ? this.renderBuildingPanel(state.selectedBuilding) : ''}

        <!-- Controls Help -->
        <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px; border: 2px solid #444; font-size: 12px; pointer-events: auto;">
          <div style="font-weight: bold; margin-bottom: 5px;">Controls</div>
          <div>• Click buildings to select</div>
          <div>• Click ground to place (DAY)</div>
          <div>• Click loot to pickup</div>
          <div>• Drag items to sockets</div>
          <div>• WASD or Arrow keys to pan</div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderBuildButtons(): string {
    const buildings = ['arrowTower', 'healerTotem', 'barracks'];

    return buildings.map(defId => {
      const def = buildingDefs[defId];
      const selected = this.engine.state.buildMode?.id === defId;

      return `
        <button
          data-build="${defId}"
          style="
            display: block;
            width: 100%;
            margin-bottom: 8px;
            padding: 10px;
            background: ${selected ? '#4488ff' : '#333'};
            color: #fff;
            border: 2px solid ${selected ? '#88aaff' : '#666'};
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
          "
        >
          <div style="font-size: 20px; display: inline-block; width: 30px;">${def.icon}</div>
          <div style="display: inline-block; vertical-align: top;">
            <div style="font-weight: bold;">${def.name}</div>
            <div style="font-size: 11px; color: #aaa;">${def.description}</div>
          </div>
        </button>
      `;
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
        draggable="true"
        style="
          background: #222;
          border: 2px solid ${rarityColors[def.rarity]};
          border-radius: 4px;
          padding: 8px;
          cursor: grab;
          min-width: 120px;
        "
        title="${def.description}"
      >
        <div style="font-size: 24px; text-align: center;">${def.icon}</div>
        <div style="font-size: 12px; font-weight: bold; text-align: center; color: ${rarityColors[def.rarity]};">
          ${def.name}
        </div>
      </div>
    `;
  }

  private renderBuildingPanel(building: Building): string {
    const def = buildingDefs[building.defId];

    return `
      <div style="position: absolute; top: 120px; right: 10px; width: 300px; background: rgba(0,0,0,0.9); padding: 15px; border-radius: 8px; border: 2px solid #4488ff; pointer-events: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <div style="font-size: 24px;">${def.icon} ${def.name}</div>
            <div style="font-size: 12px; color: #888; margin-top: 2px;">${def.description}</div>
          </div>
          <button
            data-deselect="true"
            style="background: #f44; border: none; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: pointer;"
          >
            ✕
          </button>
        </div>

        <div style="margin-top: 10px;">
          <div style="background: #333; height: 16px; border-radius: 4px; overflow: hidden;">
            <div style="background: ${building.hp > building.maxHp * 0.5 ? '#0f0' : '#f00'}; height: 100%; width: ${(building.hp / building.maxHp) * 100}%;"></div>
          </div>
          <div style="font-size: 12px; margin-top: 2px;">${Math.ceil(building.hp)} / ${building.maxHp} HP</div>
        </div>

        <div style="margin-top: 15px;">
          <div style="font-weight: bold; margin-bottom: 8px;">Item Sockets</div>
          ${this.renderSockets(building)}
        </div>

        <div style="margin-top: 15px; font-size: 11px; color: #888;">
          Active Emitters: ${building.emitters.length}
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
            style="
              background: #222;
              border: 2px solid ${rarityColors[def.rarity]};
              border-radius: 4px;
              padding: 8px;
              margin-bottom: 8px;
              position: relative;
            "
          >
            <button
              data-unsocket="${index}"
              data-building-id="${building.id}"
              style="
                position: absolute;
                top: 5px;
                right: 5px;
                background: #f44;
                border: none;
                color: #fff;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
                line-height: 1;
              "
            >
              ✕
            </button>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-size: 32px;">${def.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: bold; color: ${rarityColors[def.rarity]};">${def.name}</div>
                <div style="font-size: 11px; color: #aaa; margin-top: 2px;">${def.description}</div>
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
              background: #111;
              border: 2px dashed #444;
              border-radius: 4px;
              padding: 20px;
              margin-bottom: 8px;
              text-align: center;
              color: #666;
            "
          >
            Empty Socket<br/>
            <span style="font-size: 11px;">Drag item here</span>
          </div>
        `;
      }
    }).join('');
  }

  private attachEventListeners(): void {
    // Build buttons
    const buildButtons = this.container.querySelectorAll('[data-build]');
    buildButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const defId = btn.getAttribute('data-build');
        if (defId) {
          const def = buildingDefs[defId];
          this.engine.state.buildMode = def;
          this.engine.state.selectedBuilding = null;
          this.render();
        }
      });
    });

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
        }
      });
    });

    const sockets = this.container.querySelectorAll('[data-socket]');
    sockets.forEach(socket => {
      socket.addEventListener('dragover', (e) => {
        e.preventDefault();
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
}
