# Town Defense - Vertical Slice Prototype

A top-down day/night town defense game with a unique universal item socketing system.

## 🎮 How to Play

### Run the Game
```bash
npm install
npm run dev
```

The game will automatically open in your browser at `http://localhost:3000`.

### Game Concept

Defend your Town Core through alternating day and night cycles:

- **DAY (60 seconds)**: Build and upgrade your defenses
- **NIGHT (60 seconds)**: Survive enemy waves that drop powerful loot
- **Core Twist**: All items are UNIVERSAL - socket any item into ANY building to modify its behavior

### Controls

- **WASD** or **Arrow Keys**: Pan camera
- **Mouse Click**:
  - Select buildings
  - Place buildings (during DAY)
  - Pick up loot drops
- **Drag & Drop**: Drag items from inventory to building sockets

### Buildings

1. **🏛️ Town Core** - The heart of your town. If it's destroyed, you lose!
2. **🗼 Arrow Tower** - Shoots projectiles at enemies automatically
3. **🗿 Healer Totem** - Heals nearby friendly structures
4. **🏰 Barracks** - Spawns guard units to fight enemies

Each building has **2 item sockets** that can hold any item.

### Items & The Universal System

The game features a **universal item system** - items aren't locked to specific building types. Instead, they modify "building outputs" (damage, healing, unit spawning, etc.) in a building-agnostic way.

#### Capability Unlock Items (Add New Behaviors)

These items grant entirely new abilities to ANY building:

- **📯 Vanguard Horn** (Epic) - Building spawns guard units every 8 seconds
- **🔮 Runestone of Sentries** (Rare) - Building fires Arc Bolts at enemies
- **🕯️ Sanctuary Idol** (Rare) - Building heals nearby allies every 3 seconds
- **💀 Dread Sigil** (Epic) - Building applies Slow to nearby enemies

#### Universal Modifier Items (Enhance Outputs)

These items modify existing building behaviors:

- **💎 Serrated Ruby** (Common) - +8 damage to all damage events
- **🔶 Keen Topaz** (Common) - +15% crit chance
- **🟢 Venom Emerald** (Uncommon) - Damage applies Poison (DOT)
- **🔵 Chill Sapphire** (Uncommon) - Damage applies Slow
- **⬛ Warding Obsidian** (Uncommon) - Spawned units gain +30 HP
- **⚪ Chain Opal** (Rare) - Damage chains to 1 extra enemy
- **☠️ Cursed Skull** (Rare) - +50% damage BUT building loses 2 HP/sec
- **🗡️ Piercing Javelin** (Uncommon) - Projectiles pierce +1 enemy
- **🪶 Swiftness Feather** (Common) - Spawned units gain +20 speed
- **🔥 Blazing Core** (Rare) - +25% damage and converts to fire type

### Strategy Examples

**Universal Synergies:**
- Socket **Venom Emerald** into a **Healer Totem** → It doesn't deal damage, so no effect
- Socket **Venom Emerald** into an **Arrow Tower** → Arrows now poison enemies
- Socket **Runestone of Sentries** into a **Healer Totem** → Healer now ALSO shoots Arc Bolts!
- Socket **Vanguard Horn** into an **Arrow Tower** → Tower now spawns guards AND shoots arrows
- Socket **Warding Obsidian** into **Barracks** → Guards spawn with extra HP
- Socket **Chain Opal** into any damage-dealing building → Attacks chain to multiple enemies

## 🏗️ Architecture

### File Structure

```
src/
├── main.ts                    # Entry point, game loop, input handling
├── game/
    ├── types.ts               # All TypeScript type definitions
    ├── GameEngine.ts          # Main game logic orchestrator
    ├── Renderer.ts            # Canvas rendering
    ├── UI.ts                  # HUD and interface
    ├── systems/
    │   ├── EffectResolver.ts  # Universal item effect resolution
    │   ├── EmitterSystem.ts   # Capability unlock emitters
    │   ├── MapGenerator.ts    # Seeded map generation
    │   └── LootSystem.ts      # Loot drop generation
    └── data/
        ├── buildings.ts       # Building definitions
        ├── enemies.ts         # Enemy and unit definitions
        └── items.ts           # Item definitions (14 items)
```

### Core Systems

#### 1. Universal Effect Resolver (`EffectResolver.ts`)

The heart of the universal item system. All building behaviors produce **game events** (DamageEvent, HealEvent, SpawnUnitEvent, etc.). Before events are applied, they pass through the effect resolver which applies modifiers from socketed items.

**Event Types:**
- `DamageEvent` - Any damage dealt
- `HealEvent` - Any healing done
- `SpawnUnitEvent` - Unit creation
- `ProjectileEvent` - Projectile firing
- `AuraEvent` - Area effects
- `ApplyStatusEvent` - Status effect application

**Modifier Operations:**
- `addFlat` - Add flat values (damage, HP, speed)
- `multiply` - Multiply values
- `addTag` - Add behavior tags
- `chain` / `pierce` / `knockback` - Special effects
- `addStatusOnHit` - Apply status effects
- `addEmitter` - Grant new behaviors (capability unlocks)

#### 2. Emitter System (`EmitterSystem.ts`)

Buildings have **emitters** that tick on intervals and produce events. Emitters can come from:
1. Base building definition (e.g., Arrow Tower shoots arrows)
2. Socketed items (e.g., Runestone of Sentries adds Arc Bolt emitter)

When you socket/unsocket items, emitters are rebuilt, enabling dynamic behavior changes.

#### 3. Map Generation (`MapGenerator.ts`)

Deterministic seeded random generation creates:
- 40 trees (🌲 wood resource nodes)
- 30 ore rocks (⛰️ ore resource nodes)
- Clear center spawn area for Town Core

#### 4. Game Engine (`GameEngine.ts`)

Orchestrates all systems:
- Day/night cycle (60s each)
- Wave spawning (increasing difficulty)
- Entity updates (enemies, units, projectiles)
- Combat resolution
- Loot drops

## 🧪 Testing Checklist

To verify the vertical slice is working:

1. ✅ **Day/Night Cycle**: Wait 60 seconds, verify phase switches
2. ✅ **Building Placement**: Place Arrow Tower, Healer, Barracks during DAY
3. ✅ **Enemy Waves**: Survive at least 2 night cycles, verify increasing difficulty
4. ✅ **Loot Drops**: Kill enemies, verify gold loot drops appear
5. ✅ **Pickup Items**: Click loot drops, verify they appear in inventory
6. ✅ **Socket Items**: Drag item to building socket, verify it appears
7. ✅ **Universal Effects**:
   - Socket Venom Emerald into tower → enemies get poison effect (🧪 icon)
   - Socket Chain Opal into tower → damage chains to multiple enemies
   - Socket Warding Obsidian into Barracks → spawned guards have more HP
8. ✅ **Capability Unlocks**:
   - Socket Runestone of Sentries into Healer → healer now shoots projectiles
   - Socket Vanguard Horn into Tower → tower now spawns guards
   - Socket Sanctuary Idol into Barracks → barracks now heals allies
   - Socket Dread Sigil into any building → enemies get slow effect (❄️ icon)
9. ✅ **Status Effects**: Verify poison (green icon) and slow (ice icon) appear on enemies
10. ✅ **Game Over**: Let core HP reach 0, verify game over screen

## 🎯 Design Goals Achieved

- ✅ **Day/Night Loop**: 60s cycles with distinct behaviors
- ✅ **Town Building**: 4 building types with strategic placement
- ✅ **Enemy Waves**: Scaling difficulty with 3 enemy types
- ✅ **Loot Drops**: 14 items across 4 rarities
- ✅ **Universal Socketing**: Items work in ANY building via event system
- ✅ **Capability Unlocks**: 4 items that grant new behaviors
- ✅ **Visual Feedback**: Status icons, HP bars, socket indicators, projectiles
- ✅ **No Crashes**: Stable game loop with proper cleanup
- ✅ **2+ Cycle Playability**: Can play multiple waves without issues

## 📝 Notes

### Stacking Rules
- **Flat bonuses**: Add together (two +8 damage items = +16 total)
- **Multipliers**: Multiply together (1.5x * 1.25x = 1.875x total)
- **Status effects**: Refresh duration and stack potency (max 10 stacks)
- **Capability emitters**: All emitters from all sockets are active simultaneously

### Balance Tweaks
Edit these constants in `GameEngine.ts`:
- `dayDuration`: 60 (seconds)
- `nightDuration`: 60 (seconds)
- Wave scaling: `baseCount = 5 + wave * 3`

Edit item values in `src/game/data/items.ts`

### Adding New Items
1. Add definition to `src/game/data/items.ts`
2. Specify modifiers with operation type
3. Add to `lootPool` with weight
4. No code changes needed - fully data-driven!

### Adding New Buildings
1. Add definition to `src/game/data/buildings.ts`
2. Define base emitters
3. Add to UI build menu in `UI.ts`

---

**Enjoy defending your town!** 🏰⚔️
