> Ticket: oc:8114

# Fix flash visivo ECPOI all'avvio app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare il flash visivo dei POI globali all'avvio della mappa impostando la visibilità iniziale del layer in un unico momento, come risultato della condizione combinata `!disabled && zoom >= poisMinZoom`.

**Architecture:** Il layer `_poisClusterLayer` parte con `visible: false` immediatamente dopo la creazione. `_checkZoom` è l'unica funzione che imposta la visibilità — sia all'init che su `moveend`. Un secondo `_checkZoom` su `map.once('rendercomplete')` copre il caso in cui `wmMapConf` non sia ancora disponibile al momento dell'init.

**Tech Stack:** Angular 20, OpenLayers 7, TypeScript (strict), Karma + Jasmine (test)

## Global Constraints

- File unico toccato: `src/directives/pois.directive.ts` nel submodule `map-core`
- Non modificare la firma di `createCluster` in `utils/ol.ts`
- Non toccare `ugc-pois.directive.ts`
- Commit convention: `fix(oc:8114): ...`
- Test runner: `nvm use 22 && npx ng test map-core` (locale) oppure `CI=true npx ng test map-core --configuration=ci` (CI, solo 27 spec utils)

---

### Task 1: Rimuovere il flash — fix in `_initDirective`

**Files:**
- Modify: `src/directives/pois.directive.ts:367-397`

**Interfaces:**
- Consumes: `_poisClusterLayer` (VectorLayer<Cluster>), `_checkZoom(layer)`, `mapCmp.map`
- Produces: layer che parte `visible: false` e viene mostrato solo dopo `_checkZoom`

Il metodo `_initDirective` attuale (righe 367-397) ha questa sequenza problematica:

```typescript
// PRIMA (bug):
this._poisClusterLayer = createCluster(this._poisClusterLayer, CLUSTER_ZINDEX); // visible: true (OL default)
// ...
this._checkZoom(this._poisClusterLayer);          // riga 390: nasconde se zoom < minZoom ✅
this.mapCmp.map.addLayer(this._poisClusterLayer); // riga 391
// ...
this._poisClusterLayer?.setVisible(!this._disabled); // riga 396: sovrascrive _checkZoom 🐛
```

- [ ] **Step 1: Imposta `visible: false` subito dopo `createCluster`**

In `src/directives/pois.directive.ts`, nel metodo `_initDirective`, aggiungi una riga dopo la riga 369:

```typescript
this._poisClusterLayer = createCluster(this._poisClusterLayer, CLUSTER_ZINDEX);
this._poisClusterLayer.setVisible(false); // ← aggiungi questa riga
```

- [ ] **Step 2: Rimuovi la riga 396 (`setVisible(!this._disabled)`)**

Elimina completamente questa riga da `_initDirective`:

```typescript
// RIMUOVERE:
this._poisClusterLayer?.setVisible(!this._disabled);
```

- [ ] **Step 3: Aggiungi il safeguard `rendercomplete`**

Dopo `this.mapCmp.map.addLayer(this._poisClusterLayer)` (riga 391), aggiungi:

```typescript
this.mapCmp.map.once('rendercomplete', () => {
  this._checkZoom(this._poisClusterLayer);
});
```

Questo copre il caso in cui `wmMapConf` fosse `null` al momento della chiamata `_checkZoom` a riga 390 (la guard `if (view != null && this.wmMapConf != null)` in `_checkZoom` avrebbe saltato il check).

Il risultato finale del metodo `_initDirective` deve essere:

```typescript
private _initDirective(): void {
  this._selectedPoiLayer = createLayer(this._selectedPoiLayer, FLAG_TRACK_ZINDEX + 100);
  this._poisClusterLayer = createCluster(this._poisClusterLayer, CLUSTER_ZINDEX);
  this._poisClusterLayer.setVisible(false); // parte nascosto
  const clusterSource: Cluster = this._poisClusterLayer.getSource();
  this._hullClusterLayer = new VectorLayer({
    style: clusterHullStyle,
    source: clusterSource,
  });
  this._selectCluster = createHull();
  this._popupOverlay = new Popup({
    popupClass: 'default anim',
    closeBox: true,
    offset: [0, -16],
    positioning: 'bottom-center',
    onclose: () => {
      clearLayer(this._selectedPoiLayer);
    },
    autoPan: {
      animation: {
        duration: 100,
      },
    },
  });
  this._checkZoom(this._poisClusterLayer); // imposta visibilità basata su zoom
  this.mapCmp.map.addLayer(this._poisClusterLayer);
  this.mapCmp.map.addLayer(this._hullClusterLayer);
  this.mapCmp.map.addLayer(this._selectedPoiLayer);
  this.mapCmp.map.addOverlay(this._popupOverlay);
  this.mapCmp.map.once('rendercomplete', () => {
    this._checkZoom(this._poisClusterLayer); // safeguard se wmMapConf era null al primo check
  });
  this.mapCmp.registerDirective(this._poisClusterLayer['ol_uid'], this);
  // riga 396 RIMOSSA: setVisible(!this._disabled) non serve più
}
```

- [ ] **Step 4: Verifica manuale**

Avvia il dev server:
```bash
cd core && npm start
```
Apri `http://localhost:4200`, osserva la mappa all'avvio. I POI globali **non devono apparire** se lo zoom iniziale è sotto `poisMinZoom` (default 15). Zoomando sopra la soglia devono comparire correttamente.

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/map-core
git add src/directives/pois.directive.ts
git commit -m "fix(oc:8114): rimuovi flash visivo ECPOI impostando visible:false all'init"
```
