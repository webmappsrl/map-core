import {createFeatureSelector, createSelector} from '@ngrx/store';
import {featureKey} from './map-core.reducer';

const feature = createFeatureSelector<any>(featureKey);

export const partitionToggleState = createSelector(feature, state =>
  state && state.partitionToggleState ? state.partitionToggleState : {},
);

export const hitMapFeatureCollection = createSelector(feature, state =>
  state && state.hitMapfeatureCollections ? state.hitMapfeatureCollections : null,
);
export const hitMapGeometry = createSelector(feature, state =>
  state && state.hitMapGeometry ? state.hitMapGeometry : null,
);
export const padding = createSelector(feature, state =>
  state && state.padding ? state.padding : [10, 10, 10, 10],
);
export const leftPadding = createSelector(feature, state =>
  state && state.leftPadding ? state.leftPadding : 10,
);
export const boundingBoxes = createSelector(feature, state => state?.boundingBoxes || null);
