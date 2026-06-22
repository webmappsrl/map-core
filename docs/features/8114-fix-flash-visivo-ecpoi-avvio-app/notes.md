> Ticket: oc:8114

# Notes — Fix flash visivo ECPOI all'avvio app

## Deviazioni dal piano

Nessuna deviazione rispetto al piano approvato.

## Bug trovati

Nessun bug aggiuntivo scoperto durante l'implementazione.

## Decisioni

- Non è stato scritto un test automatico: i directive spec non girano in CI (richiedono browser con GPU) e il fix è verificabile più efficacemente in modo visivo.

## Follow-up

- `apppoisApiLayer` (campo `IPOI` in `map-core/src/types/model.ts`) non è attualmente letto da nessuna parte nel codice. Dovrebbe essere incluso in `wmMapEcPoisDisableLayer$` in `wm-core/geobox-map/geobox-map.component.ts` per disabilitare completamente la directive quando la conf non prevede POI globali. Da tracciare in ticket separato.
- Il setter `_disableClusterLayer` chiama `setVisible(!disabled)` ignorando lo zoom: se `disabled` torna `false` mentre lo zoom è sotto `poisMinZoom`, il layer diventa visibile scorrettamente. Bug pre-esistente, fuori scope di questo ticket.
