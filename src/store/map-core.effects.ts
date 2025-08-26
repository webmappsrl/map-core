import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {map, switchMap} from 'rxjs/operators';
import {
  deleteBoundingBox as deleteBoundingBoxAction,
  loadBoundingBoxes,
  loadBoundingBoxesSuccess,
} from './map-core.actions';
import {deleteBoundingBox, getAllBoundingBoxes} from '@map-core/utils';
import {from} from 'rxjs';

@Injectable()
export class MapCoreEffects {
  constructor(private actions$: Actions) {}

  loadBoundingBoxes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBoundingBoxes),
      switchMap(() =>
        from(getAllBoundingBoxes()).pipe(
          map(boundingBoxes => loadBoundingBoxesSuccess({boundingBoxes})),
        ),
      ),
    ),
  );

  deleteBoundingBox$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteBoundingBoxAction),
      switchMap(action => from(deleteBoundingBox(action.boundingBoxId))),
      map(() => loadBoundingBoxes()),
    ),
  );
}
