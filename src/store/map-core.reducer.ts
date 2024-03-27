import {createReducer, on} from '@ngrx/store';
import {setTogglePartition} from './map-core.actions';

export const featureKey = 'map-core';
export interface IUIRootState {
  [featureKey]: {
    partitionToggleState: {[key: string | number]: any};
  };
}
const initialUIState: any = {
  partitionToggleState: {},
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
);
