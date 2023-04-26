import {Coordinate} from 'ol/coordinate';
import {createCircleFeature} from './ol';
import {Feature} from 'ol';
import {Point} from 'ol/geom';
​
describe('ol', () => {
  it('createCircleFeature', () => {
    const lonlat: Coordinate = [16, 48];
    const circleFeature = createCircleFeature(lonlat);
    expect(circleFeature).toBeInstanceOf(Feature);
    expect(circleFeature.getGeometry()).toBeInstanceOf(Point);
  });
  it('prova', () => {
    expect(true).toBe(true)
  });
});