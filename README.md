# Town Defense RTS - Warcraft 3 Style Prototype

A top-down RTS game with day/night cycles, resource gathering, and a unique universal item socketing system - inspired by Warcraft 3's custom game modes.

## 🎮 Quick Start

```bash
npm install
npm run dev
```

Game opens automatically at `http://localhost:3000`.

## 🎨 Warcraft 3-Style Features

### 2.5D Isometric Aesthetic
- Radial gradients for 3D depth on all entities
- Elliptical shadows beneath units and buildings
- Painter's algorithm depth sorting
- Glowing effects for projectiles and loot
- Role-based unit icons (⚒️ workers, ⚔️ fighters, ✨ healers)

### RTS Controls
- **Edge Scrolling**: Move mouse to screen edges to pan camera (20px zone)
- **WASD/Arrow Keys**: Alternative camera control
- **Click Empty Ground**: Opens build menu at clicked location
- **Click Building**: Selects building and shows info panel
- **Drag & Drop**: Socket items into buildings

### Click-to-Build Menu (WC3 Style)
1. Click anywhere on empty ground
2. Build menu appears at that world position
3. Select building type (shows resource costs)
4. Click again to place building
5. Menu closes automatically after selection

## 🏗️ RTS Gameplay Loop

### Day Phase (90 seconds)
- Build and expand your base
- Workers automatically gather resources
- Place defensive structures
- Socket items into buildings for upgrades

### Night Phase (60 seconds)
- Enemy waves attack your Town Hall
- Defend with towers, units, and items
- Collect loot drops from defeated enemies
- Earn gold for kills (5 + wave * 2 gold per enemy)

## 🏛️ Buildings

### Core
- **🏛️ Town Hall** - Main building. Spawns workers automatically (every 12s). Losing it = game over!

### Production (Train Units)
- **⚔️ Barracks** (150 wood, 50 ore) - Trains fighter units every 8s
- **✨ Sanctum** (120 wood, 80 gold) - Trains healer units every 10s

### Military (Defensive)
- **🗼 Arrow Tower** (80 wood, 40 ore) - Auto-attacks enemies in 250 radius

### Resource
- **📦 Storage Hut** (60 wood) - Remote deposit point for workers

### Tech (Research & Upgrades)
- **🔬 Tech Lab** (100 wood, 80 ore, 50 gold) - Unlocks research upgrades
- **🔨 Forge** (120 wood, 100 ore) - Improves item quality

## ⚒️ Worker AI & Resource Gathering

Workers operate autonomously:
1. Find nearest resource node (trees 🌲 or ore ⛰️)
2. Move to node and gather (10 resources/sec)
3. When carrying capacity full (10 resources), return to nearest depot
4. Deposit resources at Town Hall or Storage Hut
5. Repeat cycle

**Resource nodes deplete** - trees have 500 wood, ore has 800 ore. Plan expansion accordingly!

## 👥 Unit Types

### ⚒️ Worker
- **Role**: Gather wood and ore
- **HP**: 50 | **Speed**: 60 | **Damage**: 3 (can fight if needed)
- **Gather Rate**: 10/sec | **Capacity**: 10 resources

### ⚔️ Fighter
- **Role**: Combat
- **HP**: 100 | **Speed**: 55 | **Damage**: 15
- **Auto-targets** nearest enemy and attacks

### ✨ Healer
- **Role**: Support
- **HP**: 70 | **Speed**: 50 | **Healing**: 25 HP
- **Auto-targets** lowest HP ally in range

## 💎 Universal Item Socketing System

**Core Concept**: Items aren't locked to specific buildings. Instead, they modify "building outputs" through an event-based system.

Every building action produces events:
- **DamageEvent** - Towers shoot, units attack
- **HealEvent** - Healers heal, totems pulse
- **SpawnUnitEvent** - Barracks produce units
- **ProjectileEvent** - Towers fire projectiles

Items modify these events **regardless of which building produced them**.

### Capability Unlock Items (Add New Behaviors)

These items grant entirely new abilities to ANY building:

#### 📯 Vanguard Horn (Epic)
"This building spawns a guard unit every 8 seconds"
- Socket into Tower → Tower spawns guards AND shoots
- Socket into Sanctum → Sanctum spawns guards AND trains healers

#### 🔮 Runestone of Sentries (Rare)
"This building fires an Arc Bolt every 2 seconds"
- Socket into Barracks → Barracks spawns units AND shoots bolts
- Socket into Storage Hut → Hut becomes a defensive structure!

#### 🕯️ Sanctuary Idol (Rare)
"This building heals nearby allies every 3 seconds"
- Socket into Tower → Tower attacks AND heals allies
- Socket into Barracks → Barracks spawns units AND heals

#### 💀 Dread Sigil (Epic)
"This building applies Slow to enemies within 100 radius"
- Socket into any building → Adds crowd control aura

### Universal Modifier Items (Enhance Outputs)

#### 💎 Serrated Ruby (Common)
"Damage +8" - Adds flat damage to ALL damage events from building

#### 🔶 Keen Topaz (Common)
"Crit chance +15%" - Adds crit to all damage

#### 🟢 Venom Emerald (Uncommon)
"Damage applies Poison for 4 seconds"
- Socket into Tower → Arrows poison enemies
- Socket into building WITH Runestone → Arc Bolts poison enemies

#### 🔵 Chill Sapphire (Uncommon)
"Damage applies Slow for 2 seconds" - Slows on hit

#### ⬛ Warding Obsidian (Uncommon)
"Spawned units gain +30 HP"
- Socket into Barracks → Fighters spawn with 130 HP
- Socket into building WITH Vanguard Horn → Guards spawn with 90 HP

#### ⚪ Chain Opal (Rare)
"Damage chains to 1 extra enemy"
- Works with tower attacks, unit attacks, Arc Bolts, etc.

#### ☠️ Cursed Skull (Rare)
"Damage +50%, but building loses 2 HP/sec"
- High risk, high reward trade-off

#### 🗡️ Piercing Javelin (Uncommon)
"Projectiles pierce +1 enemy"

#### 🪶 Swiftness Feather (Common)
"Spawned units gain +20 speed"

#### 🔥 Blazing Core (Rare)
"Damage +25% and converts to fire type"

## 📊 Resources

### 🌲 Wood
- Source: Trees (500 wood per tree)
- Used for: Most buildings (60-150 wood)

### ⛰️ Ore
- Source: Ore deposits (800 ore per deposit)
- Used for: Military buildings, tech (40-100 ore)

### 💰 Gold
- Source: Killing enemies (5 + wave * 2 gold per kill)
- Used for: Advanced buildings (50-80 gold)

**Starting Resources**: 200 wood, 150 ore, 100 gold

## 🎯 Strategy Tips

1. **Early Game**: Let workers gather automatically, build 1-2 Arrow Towers for defense
2. **Mid Game**: Build Barracks for fighters, expand with Storage Huts
3. **Socket Strategy**:
   - Socket damage items into towers for stronger defense
   - Socket capability unlocks to create hybrid buildings
   - Vanguard Horn on multiple buildings = army of guards
4. **Resource Management**: Build near resource clusters, use Storage Huts as forward depots
5. **Wave Defense**: Fighters auto-engage, healers auto-support, towers provide ranged DPS

## 🏗️ Architecture

### Core Systems

```
GameEngine.ts (838 lines)
├─ Worker AI (autonomous resource gathering)
├─ Fighter AI (seek & attack nearest enemy)
├─ Healer AI (heal lowest HP ally)
├─ Resource management (costs, deductions)
├─ Emitter system (base + socket-granted)
└─ Effect resolver (universal item pipeline)

Renderer.ts (498 lines)
├─ 2.5D isometric rendering
├─ Depth sorting (painter's algorithm)
├─ Radial gradients for 3D effect
├─ Shadows and highlights
└─ Role-based unit icons

UI.ts (433 lines)
├─ Click-to-build menu (appears at world position)
├─ Resource display (wood/ore/gold)
├─ Building selection panel
├─ Inventory with drag-and-drop
└─ Item socketing interface

main.ts
├─ Edge scrolling (20px zones)
├─ Click handling (build menu, selection, placement)
└─ Game loop with delta time
```

### Data-Driven Design

All content defined as data in `src/game/data/`:
- **buildings.ts**: 7 building types with costs and emitters
- **enemies.ts**: 3 enemy types + 3 ally unit types
- **items.ts**: 14 items (4 capability unlocks, 10 modifiers)

### Event-Based Universal System

```
Building produces event
       ↓
Effect Resolver processes socketed item modifiers
       ↓
Modified event(s) applied to game
```

Example: Tower shoots arrow
1. Tower emitter triggers → creates ProjectileEvent(damage: 20)
2. If socketed with Venom Emerald → adds ApplyStatusEvent(poison)
3. If socketed with Chain Opal → adds chain=1 to damage
4. Result: Arrow that deals 20 damage, poisons, and chains to 1 extra enemy

## 🐛 Testing

The game has been tested for:
- ✅ 2+ day/night cycles without crashes
- ✅ Worker resource gathering (depletes nodes correctly)
- ✅ Universal item effects (damage mods work on all buildings)
- ✅ Capability unlocks (Runestone makes any building shoot)
- ✅ Edge scrolling smooth camera movement
- ✅ Click-to-build menu UX flow
- ✅ Build cost validation
- ✅ Status effects (poison, slow)

## 📁 File Changes Summary

**New RTS-specific files:**
- Types updated with Resources, ResourceCost, UnitRole, gathering state
- Buildings redefined for RTS (7 buildings vs 4 original)
- Units redefined with roles (worker/fighter/healer)
- Resource nodes track remaining/max amounts

**Major rewrites:**
- **GameEngine.ts**: Complete overhaul for RTS mechanics, worker AI, resource costs
- **Renderer.ts**: Complete 2.5D rewrite with depth sorting, shadows, gradients
- **UI.ts**: Complete RTS UI with click-to-build menu
- **main.ts**: Edge scrolling + click-to-build interaction

## 🎮 Controls Reference

| Action | Control |
|--------|---------|
| Pan Camera | Move mouse to screen edge (20px) OR WASD/Arrow keys |
| Open Build Menu | Click empty ground |
| Select Building | Click building |
| Place Building | Click ground when in build mode |
| Socket Item | Drag item from inventory to socket |
| Unsocket Item | Click X button on socketed item |
| Close Menu | Click "✕ Close" button |

## 🚀 Development

```bash
# Install dependencies
npm install

# Run dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Tech Stack**: TypeScript, Vite, Canvas API

---

**Have fun building your RTS empire!** 🏰⚔️🌲
