export {
  createEntity,
  selectFinalState,
  advanceEntity,
  generateEntityRows,
  findStatePath,
} from './stateMachine.js';
export type { SimulatedEntity } from './stateMachine.js';
export { simulateLifecycles } from './simulate.js';
export { applyCorrelations } from './correlate.js';
