> Ticket: oc:8114

# Fix flash visivo ECPOI all'avvio app

## Cosa cambia

Il layer dei POI globali (`_poisClusterLayer`) non sarà più visibile per un frame prima che il range minimo venga applicato. La visibilità iniziale sarà determinata in un unico momento combinando entrambe le condizioni (`!disabled && zoom >= poisMinZoom`).

## Perché

In `_initDirective` (file `pois.directive.ts`), la sequenza attuale è:

1. `createCluster` → layer creato con `visible: true` (default OL)
2. `_checkZoom` chiamato → nasconde il layer se zoom < `poisMinZoom` ✅
3. `map.addLayer` → layer aggiunto alla mappa
4. `setVisible(!this._disabled)` → sovrascrive il risultato di `_checkZoom`, rendendo il layer visibile indipendentemente dallo zoom 🐛

Al primo `moveend` successivo `_checkZoom` viene chiamato di nuovo e nasconde correttamente i POI — ma nel frattempo sono già stati renderizzati per almeno un frame, causando il flash visivo.

## Requisiti

- [ ] Il layer `_poisClusterLayer` deve partire con `visible: false` subito dopo la creazione
- [ ] La visibilità iniziale deve essere impostata una sola volta, come risultato di `_checkZoom`, che già combina zoom e stato disabled
- [ ] La riga `this._poisClusterLayer?.setVisible(!this._disabled)` in `_initDirective` va rimossa o sostituita con una condizione combinata
- [ ] Il comportamento post-init (cambio di `_disabled` o cambio di zoom via `moveend`) non deve essere alterato

## Rischi

- **Regressione su disabled=true all'init:** se `_disabled` fosse già `true` quando `_initDirective` gira, rimuovere la riga 396 lascerebbe il layer nascosto (corretto) ma `_checkZoom` non lo renderebbe mai visibile nemmeno se disabled tornasse `false` — tuttavia il setter `wmMapPoisDisableClusterLayer` chiama già `setVisible(!disabled)` per i cambiamenti post-init, quindi questo caso è coperto.
- **`createCluster` condiviso:** `ugc-pois.directive.ts` usa la stessa factory — il fix deve essere localizzato in `pois.directive.ts` senza toccare la firma di `createCluster`.

## Out of scope

- Fix del listener `moveend` (vs `change:resolution`) — comportamento separato, non causa del flash
- Modifica alla directive UGC POI
- Qualsiasi modifica al parametro `poisMinZoom` o alla configurazione

## Moduli toccati

| File | Repo |
|------|------|
| `src/directives/pois.directive.ts` | `map-core` |
