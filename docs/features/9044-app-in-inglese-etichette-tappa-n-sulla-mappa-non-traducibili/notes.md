> Ticket: oc:9044 (doppione oc:9048)

# Notes — «Tappa N» tradotto sulla mappa, parte map-core

## Deviazioni dal piano

Nessuna.

## Bug trovati

Nessuno.

## Decisioni

- Un `ref` numerico nei tile si disegnava anche prima: `buildRefStyle` lo porta a stringa invece di
  scartarlo, così gli shard con `ref` numerici non perdono il testo sulle tracce.
- `@Input('wmMapTranslationCallback')` senza setter: al cambio dell'input `ngOnChanges` chiama già
  `_updateMap()`. Il ridisegno al cambio di lingua lo comanda il consumer con `wmMapLayerRefresh`.
- `layer.directive.ts` non ha spec nell'`include` della CI: la parte della direttiva è verificata a
  mano nella webapp locale (25/11/2026, camminiditalia in locale e su dev).

## Follow-up

- `ref` traducibile nel backend: secondo passo deciso allo scrum del 25/11/2026.
