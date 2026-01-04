import { Building, Emitter, EmitterDef } from '../types';
import { itemDefs } from '../data/items';

/**
 * Manages emitters for buildings, including base emitters and socket-granted emitters.
 * This enables capability-unlock items to add new behaviors to any building.
 */
export class EmitterSystem {
  /**
   * Rebuild emitters for a building based on its definition and sockets.
   * Called when sockets change.
   */
  rebuildEmitters(building: Building, baseEmitters: EmitterDef[]): void {
    const emitters: Emitter[] = [];

    // Add base emitters from building definition
    for (const def of baseEmitters) {
      emitters.push({
        ...def,
        lastTrigger: 0
      });
    }

    // Add emitters from socketed items
    for (const socket of building.sockets) {
      if (socket) {
        const itemDef = itemDefs[socket.defId];
        if (itemDef) {
          for (const modifier of itemDef.modifiers) {
            if (modifier.operation === 'addEmitter' && modifier.emitterDef) {
              emitters.push({
                ...modifier.emitterDef,
                lastTrigger: 0
              });
            }
          }
        }
      }
    }

    building.emitters = emitters;
  }

  /**
   * Get all emitters that should trigger this frame
   */
  getTriggeredEmitters(building: Building, currentTime: number): Emitter[] {
    const triggered: Emitter[] = [];

    for (const emitter of building.emitters) {
      const timeSinceLast = currentTime - emitter.lastTrigger;
      if (timeSinceLast >= emitter.everySec) {
        triggered.push(emitter);
        emitter.lastTrigger = currentTime;
      }
    }

    return triggered;
  }
}
