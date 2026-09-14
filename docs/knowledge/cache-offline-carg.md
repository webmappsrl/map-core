# Cache offline: fogli CARG e icone dei controlli

## Come funziona oggi

Due risorse remote hanno una cache locale con fallback: i confini dei fogli CARG usati dall'hit-test (`hit-map.directive.ts`) e le icone dei controlli mappa (`button.controls.map.ts`). Entrambe passano dall'operatore RxJS condiviso `withCacheFallback` (`src/utils/cacheFallback.ts`): fetch → valida → salva → in caso di errore leggi dalla cache. Le cache sono istanze `localForage` dedicate, `hitMapBoundariesLocalForage` e `iconBlobsLocalForage`.

## Perché così

- **Un operatore condiviso invece di due catene** (oc:8219): le due pipeline avevano validazioni divergenti — una review pre-commit aveva trovato l'icona cachata salvata senza validazione, a differenza della GeoJSON.
- **Cache dedicate, non `saveFeatureCollection`/`getFeatureCollection`** (oc:8219): quelle condividono keyspace con i download per-foglio di `downloadOverlay()` e hanno un fallback di rete implicito sul cache-miss, che avrebbe reintrodotto un retry non voluto.
- **Solo cache locale, nessun retry alla riconnessione** (oc:8219): per scaricare un foglio l'utente deve prima cliccarlo sulla mappa, il che richiede un layer di hit-test già costruito — quindi un fetch riuscito esiste sempre prima che un download possa esistere.
- **Le icone dei controlli non passano da `<wm-img>`/`getImg()`** (oc:8219): `map-core` non dipende mai da `wm-core`, e comunque `getImg()` legge da cache popolate solo dal sync UGC e foto profilo, non dalle icone di config.

## L'accoppiamento con il consumer

L'URL dei tile CARG in `hit-map.directive.ts` e l'`overlayXYZ` che il consumer passa al download devono restare la stessa base URL, senza il template `{z}/{x}/{y}.png`: `downloadOverlay()` scarica `${overlayXYZ}/${tile}.png`. Se divergono, l'utente vede un tileset e ne scarica un altro. Questo repo non vede il valore che il consumer passa.

## Debito noto

- **`navigator.onLine` è inaffidabile sui tile raster** (oc:8219): problema preesistente e più ampio, non affrontato.
- **`loadHitmap$`/`loadHitmapFeatures`/`wmMapHitmapFeatures` in `wm-core`** sembrano codice morto: rimozione proposta come ticket separato.
