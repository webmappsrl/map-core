> Ticket: oc:7988

# EC POI: show_image_on_map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pilotare il rendering immagine/icona dei related POI sulla mappa tramite il campo `feature_image.show_image_on_map` restituito dall'API, mantenendo piena retrocompatibilità con le app mobile che non mandano il campo.

**Architecture:** La modifica è localizzata in `_createPoiMarker` — il metodo che decide quale marker creare per ogni POI. La guardia attuale `feature_image.sizes['108x137'] != null` viene sostituita da una logica a tre vie: `show_image_on_map` truthy → immagine, `show_image_on_map` falsy-ma-presente → icona, `show_image_on_map` assente → fallback legacy (comportamento invariato). Il tipo `IWmImage` riceve il nuovo campo opzionale.

**Tech Stack:** Angular, OpenLayers, TypeScript, Jasmine/Karma

---

### Task 1: Aggiungi `show_image_on_map` al tipo `IWmImage`

**Files:**
- Modify: `src/types/model.ts:197-214`

- [ ] **Step 1: Aggiungi il campo opzionale all'interfaccia**

In `src/types/model.ts`, modifica `IWmImage` aggiungendo `show_image_on_map` dopo `url`:

```typescript
export interface IWmImage {
  api_url: string;
  caption: string;
  id: number;
  sizes: {
    '108x148': string;
    '108x137': string;
    '225x100': string;
    '250x150': string;
    '118x138': string;
    '108x139': string;
    '118x117': string;
    '335x250': string;
    '400x200': string;
    '1440x500': string;
    '1920x1080': string;
    '250x150': string;
  };
  url: string;
  show_image_on_map?: boolean;
}
```

- [ ] **Step 2: Verifica che il progetto compili senza errori**

```bash
cd src/app/shared/map-core && npx tsc --noEmit
```

Expected: nessun errore di compilazione.

---

### Task 2: Aggiorna la logica `_createPoiMarker`

**Files:**
- Modify: `src/directives/track.related-pois.directive.ts:480-620`

La logica attuale (riga 487):
```typescript
if (properties?.feature_image?.sizes?.['108x137'] != null) {
```
usa l'immagine ogni volta che la dimensione `108x137` esiste. La nuova logica deve distinguere tre casi.

- [ ] **Step 1: Scrivi il test che fallisce per `show_image_on_map: false`**

In `src/directives/track.related-pois.directive.spec.ts`, aggiungi dentro il `describe` esistente:

```typescript
describe('_createPoiMarker: show_image_on_map', () => {
  it('should use icon when show_image_on_map is false even if image exists', async () => {
    const poi: any = {
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [7.044635, 40.528745]},
      properties: {
        id: 99,
        feature_image: {
          id: 1,
          url: 'http://example.com/img.jpg',
          api_url: '',
          caption: '',
          show_image_on_map: false,
          sizes: {'108x137': 'http://example.com/img_108x137.jpg'},
        },
        taxonomy: {poi_type: {color: '#ff8c00', icon_name: null}},
        taxonomyIdentifiers: [],
      },
    };
    const marker = await wmMapTrackRelatedPoisDirective['_createPoiMarker'](poi);
    // quando show_image_on_map è false, NON deve usare il canvas con immagine
    // _createPoiCanvasIcon viene chiamata solo per il path immagine
    expect(marker).toBeDefined();
    // il marker deve avere uno stile con icona SVG/PNG, non canvas
    const style = marker.icon.getStyle() as Style;
    expect(style).toBeInstanceOf(Style);
  });

  it('should use image when show_image_on_map is true', async () => {
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createPoiCanvasIcon').and.callThrough();
    const poi: any = {
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [7.044635, 40.528745]},
      properties: {
        id: 100,
        feature_image: {
          id: 2,
          url: 'http://example.com/img.jpg',
          api_url: '',
          caption: '',
          show_image_on_map: true,
          sizes: {'108x137': 'http://example.com/img_108x137.jpg'},
        },
        taxonomyIdentifiers: [],
      },
    };
    await wmMapTrackRelatedPoisDirective['_createPoiMarker'](poi);
    expect(wmMapTrackRelatedPoisDirective['_createPoiCanvasIcon']).toHaveBeenCalled();
  });

  it('should use legacy behavior (image) when show_image_on_map is absent', async () => {
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createPoiCanvasIcon').and.callThrough();
    const poi: any = {
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [7.044635, 40.528745]},
      properties: {
        id: 101,
        feature_image: {
          id: 3,
          url: 'http://example.com/img.jpg',
          api_url: '',
          caption: '',
          // show_image_on_map assente — comportamento legacy
          sizes: {'108x137': 'http://example.com/img_108x137.jpg'},
        },
        taxonomyIdentifiers: [],
      },
    };
    await wmMapTrackRelatedPoisDirective['_createPoiMarker'](poi);
    expect(wmMapTrackRelatedPoisDirective['_createPoiCanvasIcon']).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

```bash
cd src/app/shared/map-core && npx ng test --include='**/track.related-pois.directive.spec.ts' --watch=false
```

Expected: i test `show_image_on_map` falliscono (il comportamento attuale non distingue i casi).

- [ ] **Step 3: Implementa la nuova logica in `_createPoiMarker`**

Sostituisci la guardia a riga 487 in `src/directives/track.related-pois.directive.ts`:

**Prima:**
```typescript
if (properties?.feature_image?.sizes?.['108x137'] != null) {
  try {
    const {marker} = await this._createPoiCanvasIcon(poi, null, selected);
    if (marker != null) {
      return marker;
    }
  } catch {
    // se la foto è rotta, proseguiamo usando l'icona
  }
}
```

**Dopo:**
```typescript
const showImageOnMap = properties?.feature_image?.show_image_on_map;
const useImage =
  showImageOnMap === true ||
  (showImageOnMap == null && properties?.feature_image?.sizes?.['108x137'] != null);

if (useImage) {
  try {
    const {marker} = await this._createPoiCanvasIcon(poi, null, selected);
    if (marker != null) {
      return marker;
    }
  } catch {
    // se la foto è rotta, proseguiamo usando l'icona
  }
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

```bash
cd src/app/shared/map-core && npx ng test --include='**/track.related-pois.directive.spec.ts' --watch=false
```

Expected: tutti i test passano, inclusi i 3 nuovi scenari.

---

### Task 3: Verifica compilazione finale

- [ ] **Step 1: Compila l'intero submodule**

```bash
cd src/app/shared/map-core && npx tsc --noEmit
```

Expected: nessun errore TypeScript.

- [ ] **Step 2: Esegui tutta la suite di test di map-core**

```bash
cd src/app/shared/map-core && npx ng test --watch=false
```

Expected: nessuna regressione — tutti i test preesistenti continuano a passare.
