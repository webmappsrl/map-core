import {createReducer, on} from '@ngrx/store';
import {
  leftPadding,
  padding,
  resetTogglePartition,
  setHitMapFeatureCollections,
  setTogglePartition,
} from './map-core.actions';

export const featureKey = 'map-core';
export interface IUIRootState {
  [featureKey]: {
    partitionToggleState: {[key: string | number]: any};
    hitMapfeatureCollections: {[sey: string]: string};
    padding: [number, number, number, number];
    leftPadding: number;
  };
}
const initialUIState: any = {
  partitionToggleState: {},
  padding: [10, 10, 10, 10],
  leftPadding: 10,
};
export const MapCoreReducer = createReducer(
  initialUIState,
  on(setTogglePartition, (state, {toggle}) => {
    let partitionToggleState = {...state.partitionToggleState};
    if (partitionToggleState[toggle] != null) {
      partitionToggleState[toggle] = !partitionToggleState[toggle];
    } else {
      partitionToggleState[toggle] = false;
    }
    return {
      ...state,
      ...{partitionToggleState},
    };
  }),
  on(resetTogglePartition, state => ({
    ...state,
    partitionToggleState: {},
  })),
  on(setHitMapFeatureCollections, (state, {hitMapfeatureCollections}) => {
    return {
      ...state,
      ...{hitMapfeatureCollections},
    };
  }),
  on(padding, (state, {padding}) => {
    return {
      ...state,
      ...{padding},
    };
  }),
  on(leftPadding, (state, {leftPadding}) => {
    return {
      ...state,
      ...{leftPadding},
    };
  }),
);
