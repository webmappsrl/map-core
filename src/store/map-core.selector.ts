import {createFeatureSelector, createSelector} from '@ngrx/store';
import {featureKey} from './map-core.reducer';

const feature = createFeatureSelector<any>(featureKey);

export const partitionToggleState = createSelector(feature, state =>
  state && state.partitionToggleState ? state.partitionToggleState : {},
);

export const hitMapFeatureCollection = createSelector(feature, state =>
  state && state.hitMapfeatureCollections ? state.hitMapfeatureCollections : {},
);
