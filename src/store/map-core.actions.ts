import {createAction, props} from '@ngrx/store';

export const setTogglePartition = createAction(
  '[map-core] Set toggle partition',
  props<{toggle: any}>(),
);
