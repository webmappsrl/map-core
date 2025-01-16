import {createAction, props} from '@ngrx/store';

export const setTogglePartition = createAction(
  '[map-core] Set toggle partition',
  props<{toggle: any}>(),
);
export const resetTogglePartition = createAction('[map-core] Reset toggle partition');
export const setHitMapFeatureCollections = createAction(
  '[map-core][hit-map] Set hit map feature collections partition',
  props<{hitMapfeatureCollections: {[key: string]: string}}>(),
);

export const padding = createAction('[map-core] Set padding', props<{padding: number[]}>());
export const leftPadding = createAction(
  '[map-core] Set left padding',
  props<{leftPadding: number[]}>(),
);
