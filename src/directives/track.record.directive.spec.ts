import {SimpleChange} from '@angular/core';
import {toLonLat} from 'ol/proj';
import {WmMapTrackRecordDirective} from './track.record.directive';

describe('WmMapTrackRecordDirective', () => {
  const loc = (i: number): any => ({latitude: 43 + i * 0.001, longitude: 10, altitude: 0});
  let directive: WmMapTrackRecordDirective;
  let geometry: any;
  const latitudes = () =>
    geometry.getCoordinates().map((c: number[]) => +toLonLat(c)[1].toFixed(3));
  const setLocations = (list: any[] | null) => {
    directive.WmMapTrackRecordLocations = list;
    directive.ngOnChanges({WmMapTrackRecordLocations: new SimpleChange(null, list, false)});
  };

  beforeEach(() => {
    directive = new WmMapTrackRecordDirective({map: {addLayer() {}, removeLayer() {}}} as any);
    directive.WmMapTrackRecord = true;
    directive.ngOnChanges({WmMapTrackRecord: new SimpleChange(false, true, true)});
    geometry = (directive as any)._feature.getGeometry();
  });

  it('elenco che si allunga: aggiunge solo i punti nuovi con un solo changed', () => {
    const drawn = [loc(0), loc(1)];
    setLocations(drawn);
    const setSpy = spyOn(geometry, 'setCoordinates').and.callThrough();
    const changedSpy = spyOn(geometry, 'changed').and.callThrough();

    setLocations(drawn.concat([loc(2), loc(3)]));

    expect(setSpy).not.toHaveBeenCalled();
    expect(changedSpy).toHaveBeenCalledTimes(1);
    expect(latitudes()).toEqual([43, 43.001, 43.002, 43.003]);
    expect(geometry.getExtent()[3]).toBeCloseTo(geometry.getCoordinates()[3][1], 3);
  });

  it('punto cambiato prima della coda: ridisegna tutto', () => {
    const drawn = [loc(0), loc(1), loc(2)];
    setLocations(drawn);
    const setSpy = spyOn(geometry, 'setCoordinates').and.callThrough();

    setLocations([drawn[0], drawn[2], loc(3)]);

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(latitudes()).toEqual([43, 43.002, 43.003]);
  });

  it('elenco vuoto: svuota la linea, che poi riparte', () => {
    setLocations([loc(0), loc(1)]);
    setLocations([]);
    expect(latitudes()).toEqual([]);

    setLocations([loc(5)]);
    expect(latitudes()).toEqual([43.005]);
  });

  it('punti non validi in coda: saltati', () => {
    const drawn = [loc(0)];
    setLocations(drawn);
    setLocations(drawn.concat([{latitude: null, longitude: null} as any, loc(1)]));
    expect(latitudes()).toEqual([43, 43.001]);
  });

  it('layer ricreato: disegna tutto l elenco', () => {
    setLocations([loc(0), loc(1)]);
    directive.ngOnChanges({WmMapTrackRecord: new SimpleChange(true, false, false)});
    directive.WmMapTrackRecord = true;
    directive.ngOnChanges({WmMapTrackRecord: new SimpleChange(false, true, false)});
    geometry = (directive as any)._feature.getGeometry();
    expect(latitudes()).toEqual([43, 43.001]);
  });
});
