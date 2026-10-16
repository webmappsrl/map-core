import {Subject, of} from 'rxjs';
import View from 'ol/View';
import {WmMapPositionDirective} from './position.directive';
import {WmMapComponent} from '../components';

const LOCATION = {accuracy: 10, altitude: 100, bearing: 0, latitude: 42.99, longitude: 13.87};
const MAX_ZOOM = 17;

/**
 * Zoom sulla posizione e inseguimento quando arrivano insieme, come con «Inizia il cammino» di
 * camminiditalia: la registrazione accende l'inseguimento mentre si apre il pannello. Non monta un
 * `OlMap`: la mappa è finta, la `View` di OpenLayers è vera e anima da sola.
 */
describe('WmMapPositionDirective: zoom sulla posizione e inseguimento', () => {
  let view: View;
  let directive: WmMapPositionDirective;

  beforeEach(() => {
    view = new View({center: [0, 0], zoom: 6, maxZoom: MAX_ZOOM});
    const map = {getView: () => view, getSize: () => [390, 800], render: () => {}};
    const mapCmp = {isInit$: new Subject<boolean>(), map, queryParams$: of({})};
    directive = new WmMapPositionDirective(mapCmp as unknown as WmMapComponent);
    directive.wmMapConf = {maxZoom: MAX_ZOOM} as any;
    directive.ngOnChanges({wmMapPositioncurrentLocation: {currentValue: LOCATION} as any});
  });

  /**
   * Aspetta la fine delle animazioni della vista.
   * @returns una promise risolta a vista ferma
   */
  async function settled(): Promise<void> {
    await new Promise(r => setTimeout(r, 700));
  }

  it('da solo, lo zoom arriva un livello sotto il massimo', async () => {
    directive.ngOnChanges({wmMapPositionZoomCurrentLocation: {currentValue: true} as any});
    await settled();
    expect(view.getZoom()).toBeCloseTo(MAX_ZOOM - 1, 1);
  });

  it("insieme all'inseguimento, lo zoom arriva in fondo e poi sale di uno", async () => {
    directive.ngOnChanges({
      wmMapPositionZoomCurrentLocation: {currentValue: true} as any,
      wmMapPositionfocus: {currentValue: true} as any,
    });
    await settled();
    expect(view.getZoom()).toBeCloseTo(MAX_ZOOM, 1);
  });

  it("l'inseguimento arrivato a zoom in corso aspetta la fine dello zoom", async () => {
    directive.ngOnChanges({wmMapPositionZoomCurrentLocation: {currentValue: true} as any});
    directive.ngOnChanges({wmMapPositionfocus: {currentValue: true} as any});
    await settled();
    expect(view.getZoom()).toBeCloseTo(MAX_ZOOM, 1);
  });

  it('da solo, l\'inseguimento sale subito di uno', () => {
    directive.ngOnChanges({wmMapPositionfocus: {currentValue: true} as any});
    expect(view.getZoom()).toBeCloseTo(7, 1);
  });

  it("l'inseguimento spento a zoom in corso non sale più di uno", async () => {
    directive.ngOnChanges({
      wmMapPositionZoomCurrentLocation: {currentValue: true} as any,
      wmMapPositionfocus: {currentValue: true} as any,
    });
    directive.ngOnChanges({wmMapPositionfocus: {currentValue: false} as any});
    await settled();
    expect(view.getZoom()).toBeCloseTo(MAX_ZOOM - 1, 1);
  });
});
