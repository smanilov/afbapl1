import { configureSourcePersistance } from './source_area.js';
import { configureIOEditBehavior } from './io_area.js';

export function init() {
  configureSourcePersistance();
  configureIOEditBehavior();
}
