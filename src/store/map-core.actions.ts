import {createAction, props} from '@ngrx/store';
import {WmFeature} from '@wm-types/feature';
import {MultiPolygon} from 'geojson';

export const setTogglePartition = createAction(
  '[map-core] Set toggle partition',
  props<{toggle: any}>(),
);
export const resetTogglePartition = createAction('[map-core] Reset toggle partition');
export const setHitMapFeatureCollections = createAction(
  '[map-core][hit-map] Set hit map feature collections partition',
  props<{hitMapfeatureCollections: {[key: string]: string}}>(),
);
export const setHitMapGeometry = createAction(
  '[map-core][hit-map] Set hit map geometry',
  props<{hitMapGeometry: any}>(),
);

export const loadBoundingBoxes = createAction('[map-core] Load bounding boxes');
export const loadBoundingBoxesSuccess = createAction(
  '[map-core] Load bounding boxes success',
  props<{boundingBoxes: WmFeature<MultiPolygon>[]}>(),
);
export const deleteBoundingBox = createAction(
  '[map-core] Delete bounding box',
  props<{boundingBoxId: string}>(),
);

export const padding = createAction('[map-core] Set padding', props<{padding: number[]}>());
export const leftPadding = createAction(
  '[map-core] Set left padding',
  props<{leftPadding: number}>(),
);
