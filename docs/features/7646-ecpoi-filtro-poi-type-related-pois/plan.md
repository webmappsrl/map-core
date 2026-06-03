> Ticket: oc:7646

# ECPOI filtro POI type — Related POI (map-core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estendere il filtro POI type ai related POI nella `WmMapTrackRelatedPoisDirective`, in modo che quando l'utente filtra per tipo, la coerenza sia garantita tra POI globali e POI della traccia corrente.

**Architecture:** Si aggiunge `@Input() wmMapPoisFilters` alla directive. I marker vengono creati una sola volta al caricamento della traccia (`_allPoiMarkers`) e al cambio filtro viene aggiornato solo il layer (clear + riaggiunta feature filtrate), senza ricreare i marker. La funzione `isArrayContained` viene estratta in `src/utils/ol.ts` per essere condivisa con `pois.directive.ts`.

**Tech Stack:** Angular (direttive standalone=false), OpenLayers (VectorLayer, VectorSource, Feature), RxJS (BehaviorSubject, distinctUntilChanged), TypeScript, Jasmine/Karma.

---

## File Map

| File | Azione | Responsabilità |
|---|---|---|
| `src/utils/ol.ts` | Modify | Aggiunge export `isArrayContained(needle, haystack)` |
| `src/utils/ol.spec.ts` | Modify | Test unitari per `isArrayContained` |
| `src/directives/track.related-pois.directive.ts` | Modify | Aggiunge input filtro, `_allPoiMarkers`, `_updateFilteredPois()` |
| `src/directives/track.related-pois.directive.spec.ts` | Modify | Test filtro: vuoto, null, senza taxonomyIdentifiers, matching |

---

## Task 1: Estrai `isArrayContained` in `src/utils/ol.ts`

**Files:**
- Modify: `src/utils/ol.ts`
- Modify: `src/utils/ol.spec.ts`

### Perché prima

`pois.directive.ts` ha già `_isArrayContained` come metodo privato. Il Task 1 la estrae in utils così sia `pois.directive.ts` che `track.related-pois.directive.ts` la importano dallo stesso posto. Questo previene la duplicazione della logica.

- [ ] **Step 1.1: Scrivi il test failing in `src/utils/ol.spec.ts`**

Apri `src/utils/ol.spec.ts` e aggiungi in fondo al file (prima della chiusura dell'ultimo `describe`, oppure come nuovo `describe` di primo livello se il file ha struttura flat):

```typescript
describe('isArrayContained', () => {
  it('should return true when needle is empty', () => {
    expect(isArrayContained([], ['a', 'b'])).toBeTrue();
  });

  it('should return true when all needle elements are in haystack', () => {
    expect(isArrayContained(['poi_type_beach'], ['where_toscana', 'poi_type_beach'])).toBeTrue();
  });

  it('should return false when needle has an element not in haystack', () => {
    expect(isArrayContained(['poi_type_beach'], ['where_toscana', 'poi_type_lake'])).toBeFalse();
  });

  it('should return false when needle is longer than haystack', () => {
    expect(isArrayContained(['a', 'b', 'c'], ['a', 'b'])).toBeFalse();
  });
});
```

Assicurati che l'import sia presente in testa al file:
```typescript
import { isArrayContained } from './ol';
```

- [ ] **Step 1.2: Esegui il test per verificare che fallisca**

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng test --include='src/app/shared/map-core/src/utils/ol.spec.ts' --watch=false
```

Risultato atteso: FAIL — `isArrayContained` is not exported from `./ol`.

- [ ] **Step 1.3: Aggiungi `isArrayContained` a `src/utils/ol.ts`**

In fondo al file `src/utils/ol.ts`, aggiungi:

```typescript
/**
 * Returns true if every element of needle is present in haystack.
 * An empty needle always returns true.
 */
export function isArrayContained(needle: any[], haystack: any[]): boolean {
  if (needle.length > haystack.length) return false;
  return needle.every(element => haystack.includes(element));
}
```

- [ ] **Step 1.4: Esegui i test per verificare che passino**

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng test --include='src/app/shared/map-core/src/utils/ol.spec.ts' --watch=false
```

Risultato atteso: tutti i test PASS.

- [ ] **Step 1.5: Aggiorna `pois.directive.ts` per usare la funzione condivisa**

In `src/directives/pois.directive.ts`:

1. Aggiungi l'import (se non già presente, vicino agli altri import da utils):
```typescript
import { isArrayContained } from '../utils';
```

2. Trova il metodo privato `_isArrayContained` (righe ~399):
```typescript
private _isArrayContained(needle: any[], haystack: any[]): boolean {
  if (needle.length > haystack.length) return false;
  return needle.every(element => haystack.includes(element));
}
```
Rimuovilo interamente.

3. Nei due punti dove veniva chiamato `this._isArrayContained(...)` (~righe 580, 588-589), sostituisci con `isArrayContained(...)` (senza `this._`).

- [ ] **Step 1.6: Verifica che i test di `pois.directive.spec.ts` passino ancora**

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng test --include='src/app/shared/map-core/src/directives/pois.directive.spec.ts' --watch=false
```

Risultato atteso: tutti i test PASS (nessuna regressione).

---

## Task 2: Aggiungi il filtro a `WmMapTrackRelatedPoisDirective`

**Files:**
- Modify: `src/directives/track.related-pois.directive.ts`

### Panoramica delle modifiche

1. Aggiungere `_allPoiMarkers: PoiMarker[]` — lista completa dei marker (mai filtrata)
2. Aggiungere `@Input() wmMapPoisFilters` con setter che chiama `_updateFilteredPois()`
3. Aggiungere metodo `_updateFilteredPois()` che applica il predicato e aggiorna il layer
4. Modificare `_addPoisMarkers()` per popolare `_allPoiMarkers` invece di (o oltre a) `_poiMarkers`
5. Modificare `_resetView()` per resettare anche `_allPoiMarkers`

- [ ] **Step 2.1: Aggiungi import di `isArrayContained` e `distinctUntilChanged`**

In testa a `src/directives/track.related-pois.directive.ts`, verifica/aggiungi:

```typescript
import { distinctUntilChanged } from 'rxjs/operators';
import { isArrayContained } from '../utils';
```

(Se `distinctUntilChanged` è già importato da `rxjs/operators`, non duplicarlo.)

- [ ] **Step 2.2: Aggiungi `_allPoiMarkers` e `_wmMapPoisFilters$` come proprietà private**

Nella sezione delle proprietà private della classe (vicino a `_poiMarkers`), aggiungi:

```typescript
private _allPoiMarkers: PoiMarker[] = [];
private _wmMapPoisFilters: string[] = [];
```

- [ ] **Step 2.3: Aggiungi `@Input() wmMapPoisFilters` con setter**

Subito dopo gli altri `@Input()` setter esistenti, aggiungi:

```typescript
@Input() set wmMapPoisFilters(filters: string[] | null) {
  const normalized = filters ?? [];
  if (JSON.stringify(normalized) === JSON.stringify(this._wmMapPoisFilters)) return;
  this._wmMapPoisFilters = normalized;
  this._updateFilteredPois();
}
```

> Nota: usiamo `JSON.stringify` per il confronto rapido invece di `distinctUntilChanged` a livello di Observable, perché il valore arriva via `@Input` (non via Observable).

- [ ] **Step 2.4: Aggiungi il metodo `_updateFilteredPois()`**

Nella sezione dei metodi privati (vicino a `_resetView`), aggiungi:

```typescript
private _updateFilteredPois(): void {
  if (!this._poisLayer || !this._initPois$.value) return;

  const source = this._poisLayer.getSource() as VectorSource;
  source.clear();

  const toShow = this._allPoiMarkers.filter(marker => {
    if (this._wmMapPoisFilters.length === 0) return true;
    const ids: string[] | null | undefined =
      marker.poi?.properties?.taxonomyIdentifiers;
    if (!ids || ids.length === 0) return true;
    return isArrayContained(this._wmMapPoisFilters, ids);
  });

  toShow.forEach(marker => {
    if (marker.icon != null) {
      source.addFeature(marker.icon);
    }
  });
  source.changed();
  this._poisLayer.changed();
}
```

- [ ] **Step 2.5: Modifica `_addPoisMarkers()` per popolare `_allPoiMarkers`**

Trova il metodo `_addPoisMarkers`. Subito prima del ciclo `for (const poi of poiCollection)`:

```typescript
// linea esistente: this._poisLayer = createLayer(this._poisLayer, CLUSTER_ZINDEX);
// linea esistente: this.mapCmp.map.addLayer(this._poisLayer);
// linea esistente: for (let i = this._poiMarkers?.length - 1; ...
```

Aggiungi il reset di `_allPoiMarkers` all'inizio del metodo (subito dopo la riga `this._poisLayer = createLayer(...)`):

```typescript
this._allPoiMarkers = [];
```

E alla fine del ciclo, subito dopo `this._poiMarkers.push(marker)`:

```typescript
this._allPoiMarkers.push(marker);
```

La sequenza completa del ciclo diventa:

```typescript
if (poiCollection) {
  for (const poi of poiCollection) {
    try {
      const marker = await this._createPoiMarker(poi);
      if (marker != null && marker.icon != null) {
        this._poiMarkers.push(marker);
        this._allPoiMarkers.push(marker);
        addFeatureToLayer(this._poisLayer, marker.icon);
      }
    } catch (e) {
      // swallow marker creation errors to avoid breaking other POIs
    }
  }
}
this._initPois$.next(true);
```

Subito dopo `this._initPois$.next(true)`, chiama il filtro per applicare l'eventuale filtro già presente:

```typescript
this._updateFilteredPois();
```

- [ ] **Step 2.6: Modifica `_resetView()` per resettare `_allPoiMarkers`**

Trova `_resetView()`. Vicino alla riga `this._poiMarkers = []`, aggiungi:

```typescript
this._allPoiMarkers = [];
```

---

## Task 3: Test unitari del filtro in `track.related-pois.directive.spec.ts`

**Files:**
- Modify: `src/directives/track.related-pois.directive.spec.ts`

- [ ] **Step 3.1: Scrivi i test failing**

Apri `src/directives/track.related-pois.directive.spec.ts`. Nella `describe('wmMapTrackRelatedPoisDirective', ...)`, aggiungi un nuovo blocco `describe` in fondo:

```typescript
describe('wmMapPoisFilters input', () => {
  const makePoi = (taxonomyIdentifiers: string[] | null | undefined): PoiMarker => ({
    id: String(Math.random()),
    poi: {
      type: 'Feature',
      properties: {
        id: Math.random(),
        taxonomyIdentifiers: taxonomyIdentifiers as any,
      },
      geometry: { type: 'Point', coordinates: [0, 0] },
    } as any,
    icon: new Feature(),
  });

  beforeEach(() => {
    // Popola _allPoiMarkers direttamente per isolare il filtro dalla creazione async dei marker
    const poiBianca = makePoi(['poi_type_beach', 'where_toscana']);
    const poiMontagna = makePoi(['poi_type_mountain']);
    const poiSenzaTipo = makePoi([]);
    const poiNullId = makePoi(null);
    wmMapTrackRelatedPoisDirective['_allPoiMarkers'] = [poiBianca, poiMontagna, poiSenzaTipo, poiNullId];
    // Simula _initPois$ = true per sbloccare il filtro
    wmMapTrackRelatedPoisDirective['_initPois$'].next(true);
    // Crea il layer se non esiste
    if (!wmMapTrackRelatedPoisDirective['_poisLayer']) {
      wmMapTrackRelatedPoisDirective['_poisLayer'] = new VectorLayer({ source: new VectorSource() });
    }
  });

  it('filtro vuoto: mostra tutti i POI', () => {
    wmMapTrackRelatedPoisDirective.wmMapPoisFilters = [];
    const source = wmMapTrackRelatedPoisDirective['_poisLayer'].getSource() as VectorSource;
    expect(source.getFeatures().length).toBe(4);
  });

  it('filtro null: mostra tutti i POI', () => {
    wmMapTrackRelatedPoisDirective.wmMapPoisFilters = null as any;
    const source = wmMapTrackRelatedPoisDirective['_poisLayer'].getSource() as VectorSource;
    expect(source.getFeatures().length).toBe(4);
  });

  it('POI senza taxonomyIdentifiers (vuoto): sempre visibile con filtro attivo', () => {
    wmMapTrackRelatedPoisDirective.wmMapPoisFilters = ['poi_type_beach'];
    const source = wmMapTrackRelatedPoisDirective['_poisLayer'].getSource() as VectorSource;
    // poiBianca (match) + poiSenzaTipo (pass-through) + poiNullId (pass-through) = 3
    expect(source.getFeatures().length).toBe(3);
  });

  it('filtro attivo: mostra solo i POI matching', () => {
    wmMapTrackRelatedPoisDirective.wmMapPoisFilters = ['poi_type_mountain'];
    const source = wmMapTrackRelatedPoisDirective['_poisLayer'].getSource() as VectorSource;
    // poiMontagna (match) + poiSenzaTipo (pass-through) + poiNullId (pass-through) = 3
    expect(source.getFeatures().length).toBe(3);
  });
});
```

Assicurati che gli import necessari siano presenti in testa al file (Feature, VectorLayer, VectorSource sono già importati nello spec esistente — verifica):

```typescript
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Feature} from 'ol';
```

- [ ] **Step 3.2: Esegui i test per verificare che falliscano**

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng test --include='src/app/shared/map-core/src/directives/track.related-pois.directive.spec.ts' --watch=false
```

Risultato atteso: FAIL — `wmMapPoisFilters` non esiste sulla directive.

- [ ] **Step 3.3: Verifica che i test passino dopo il Task 2**

Dopo aver completato il Task 2, riesegui:

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng test --include='src/app/shared/map-core/src/directives/track.related-pois.directive.spec.ts' --watch=false
```

Risultato atteso: tutti i test PASS (inclusi quelli esistenti — nessuna regressione).

---

## Task 4: Binding template in `wm-core`

**Files:**
- Modify: `projects/wm-core/src/geobox-map/geobox-map.component.html` (in wm-core)

- [ ] **Step 4.1: Aggiungi il binding nel template**

In `/Users/bongiu/Documents/apps/webmapp-app/core/src/app/shared/wm-core/projects/wm-core/src/geobox-map/geobox-map.component.html`, trova il blocco `wmMapTrackRelatedPois` (riga ~55):

```html
wmMapTrackRelatedPois
[wmTrackRelatedPoiIcons]="icons$|async"
[related-current-ec-poi-id]="currentRelatedPoiID$|async"
```

Aggiungi subito dopo `wmMapTrackRelatedPois`:

```html
wmMapTrackRelatedPois
[wmMapPoisFilters]="poiFilterIdentifiers$|async"
[wmTrackRelatedPoiIcons]="icons$|async"
[related-current-ec-poi-id]="currentRelatedPoiID$|async"
```

- [ ] **Step 4.2: Verifica compilazione TypeScript**

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng build --configuration=development 2>&1 | grep -E "error|warning" | head -20
```

Risultato atteso: nessun errore di compilazione legato a `wmMapPoisFilters`.

---

## Task 5: Suite completa e verifica finale

- [ ] **Step 5.1: Esegui tutta la suite map-core**

```bash
cd /Users/bongiu/Documents/apps/webmapp-app/core
npx ng test --watch=false 2>&1 | tail -20
```

Risultato atteso: tutti i test PASS, nessuna regressione.

- [ ] **Step 5.2: Aggiorna `docs/features/7646-ecpoi-filtro-poi-type-related-pois/overview.md`**

Marca tutti i requisiti come completati (`- [x]`).

---

## Note per il deployment

⚠️ **map-core e wm-core devono essere sincronizzati**: la PR di map-core deve essere mergeata prima o insieme alla PR di wm-core. Il binding in wm-core dipende dal nuovo `@Input()` in map-core — se wm-core viene deployato per primo, Angular non darà errore (l'input semplicemente non esiste) ma il filtro non funzionerà.
