import {Observable, from, of} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

/**
 * Shared shape for "fetch remote resource, persist it locally on success,
 * fall back to the local cache on failure or on an invalid payload" —
 * used by hit-map.directive.ts (GeoJSON boundaries) and
 * button.controls.map.ts (control icons) so the two don't hand-roll
 * the same switchMap/catchError chain with diverging validation.
 */
export function withCacheFallback<T>(
  save: (value: T) => void,
  getCached: () => Promise<T | null>,
  logLabel: string,
  isValid: (value: T) => boolean = () => true,
) {
  return (source: Observable<T>): Observable<T | null> =>
    source.pipe(
      switchMap(value => {
        if (!isValid(value)) {
          console.error(`${logLabel}: invalid payload received, falling back to cache`, value);
          return from(getCached());
        }
        save(value);
        return of(value);
      }),
      catchError(error => {
        console.error(`${logLabel}: request failed, falling back to cache`, error);
        return from(getCached());
      }),
    );
}
