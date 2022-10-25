import {Directive, Input, OnChanges, SimpleChanges} from '@angular/core';

import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import FillStyle from 'ol/style/Fill';
import StrokeStyle from 'ol/style/Stroke';
import Style from 'ol/style/Style';

import {WmMapBaseDirective} from './base.directive';
import {endIconHtml, startIconHtml} from './icons';
import {ILocation} from './types/location';
import {ILineString} from './types/model';
import {coordsFromLonLat, createIconFeatureFromHtml} from './utils/ol';
import {getFlowStyle, getLineStyle} from './utils/styles';
import {FLAG_TRACK_ZINDEX, POINTER_TRACK_ZINDEX, SELECTED_TRACK_ZINDEX} from './zIndex';

@Directive({
  selector: '[wmMapTrack]',
})
export class WmMapTrackDirective extends WmMapBaseDirective implements OnChanges {
  private _elevationChartLayer: VectorLayer;
  private _elevationChartPoint: Feature<Point>;
  private _elevationChartSource: VectorSource;
  private _elevationChartTrack: Feature<LineString>;
  private _endFeature: Feature<Geometry>;
  private _initTrack = false;
  private _startEndLayer: VectorLayer;
  private _startFeature: Feature<Geometry>;
  private _trackFeatures: Feature<Geometry>[];
  private _trackLayer: VectorLayer;

  @Input() conf: IMAP;
  @Input() layer;
  @Input() track;
  @Input() trackElevationChartElements: any;

  drawTrack(trackgeojson: any): void {
    const isFlowLine = this.conf.flow_line_quote_show || false;
    const orangeTreshold = this.conf.flow_line_quote_orange || 800;
    const redTreshold = this.conf.flow_line_quote_red || 1500;
    const geojson: any = this._getGeoJson(trackgeojson);
    this._trackFeatures = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(geojson);
    this._trackLayer = new VectorLayer({
      source: new VectorSource({
        format: new GeoJSON(),
        features: this._trackFeatures,
      }),
      style: () =>
        isFlowLine ? getFlowStyle(orangeTreshold, redTreshold) : getLineStyle('#caaf15'),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: SELECTED_TRACK_ZINDEX,
    });

    this.map.addLayer(this._trackLayer);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const resetCondition =
      (changes.track &&
        changes.track.previousValue != null &&
        changes.track.currentValue != null &&
        changes.track.previousValue.properties.id != changes.track.currentValue.properties.id) ??
      false;
    if (this.track == null || this.map == null || resetCondition) {
      this._resetView();
      this._initTrack = false;
    }
    if (this.conf != null && this.track != null && this.map != null && this._initTrack === false) {
      this._init();
      this._initTrack = true;
    }
    if (this.track != null && this.map != null && this.trackElevationChartElements != null) {
      this._drawTemporaryLocationFeature(
        this.trackElevationChartElements?.location,
        this.trackElevationChartElements?.track,
      );
    }
    if (this.map != null && changes.track != null) {
      const ext = this._trackFeatures[0].getGeometry().getExtent() ?? undefined;
      if (ext) {
        const optOptions = {
          duration: 500,
          padding: this.padding ?? undefined,
        };
        this.map.getView().fit(ext, optOptions);
      }
    }
  }

  private _drawTemporaryLocationFeature(location?: ILocation, track?: any): void {
    if (location) {
      if (!this._elevationChartSource) {
        this._elevationChartSource = new VectorSource({
          format: new GeoJSON(),
        });
      }
      if (!this._elevationChartLayer) {
        this._elevationChartLayer = new VectorLayer({
          source: this._elevationChartSource,
          style: feature => {
            if (feature.getGeometry().getType() === 'Point') {
              return [
                new Style({
                  image: new CircleStyle({
                    fill: new FillStyle({
                      color: '#000',
                    }),
                    radius: 7,
                    stroke: new StrokeStyle({
                      width: 2,
                      color: '#fff',
                    }),
                  }),
                  zIndex: POINTER_TRACK_ZINDEX,
                }),
              ];
            } else {
              return getLineStyle(this._elevationChartTrack.get('color'));
            }
          },
          updateWhileAnimating: false,
          updateWhileInteracting: false,
          zIndex: POINTER_TRACK_ZINDEX,
        });
        this.map.addLayer(this._elevationChartLayer);
      }

      if (location) {
        const pointGeometry: Point = new Point(
          coordsFromLonLat([location.longitude, location.latitude]),
        );

        if (this._elevationChartPoint) {
          this._elevationChartPoint.setGeometry(pointGeometry);
        } else {
          this._elevationChartPoint = new Feature(pointGeometry);
          this._elevationChartSource.addFeature(this._elevationChartPoint);
        }

        if (track) {
          const trackGeometry: LineString = new LineString(
            (track.geometry.coordinates as ILineString).map(value => coordsFromLonLat(value)),
          );
          const trackColor: string = track?.properties?.color;

          if (this._elevationChartTrack) {
            this._elevationChartTrack.setGeometry(trackGeometry);
            this._elevationChartTrack.set('color', trackColor);
          } else {
            this._elevationChartTrack = new Feature(trackGeometry);
            this._elevationChartTrack.set('color', trackColor);
            this._elevationChartSource.addFeature(this._elevationChartTrack);
          }
        }
      } else {
        this._elevationChartPoint = undefined;
        this._elevationChartTrack = undefined;
        this._elevationChartSource.clear();
      }

      this.map.render();
    } else if (this._elevationChartSource && this.map) {
      this._elevationChartPoint = undefined;
      this._elevationChartTrack = undefined;
      this._elevationChartSource.clear();
      this.map.render();
    }
  }

  private _getGeoJson(trackgeojson: any): any {
    if (trackgeojson?.geoJson) {
      return trackgeojson.geoJson;
    }
    if (trackgeojson?.geometry) {
      return trackgeojson.geometry;
    }
    if (trackgeojson?._geometry) {
      return trackgeojson._geometry;
    }
    return trackgeojson;
  }

  private _init(): void {
    const startPosition = this.track.geometry.coordinates[0];
    const endPosition = this.track.geometry.coordinates[this.track.geometry.coordinates.length - 1];
    this._startFeature = createIconFeatureFromHtml(startIconHtml, startPosition);
    this._endFeature = createIconFeatureFromHtml(endIconHtml, endPosition);
    this._startEndLayer = new VectorLayer({
      zIndex: FLAG_TRACK_ZINDEX,
      source: new VectorSource({
        features: [this._startFeature, this._endFeature],
      }),
    });

    this.map.addLayer(this._startEndLayer);
    this.drawTrack(this.track);
  }

  private _resetView(): void {
    if (this._elevationChartLayer != null) {
      this._elevationChartSource.removeFeature(this._elevationChartPoint);
      this._elevationChartSource.clear();
      this.map.removeLayer(this._elevationChartLayer);
      this._elevationChartLayer = undefined;
      this._elevationChartPoint = undefined;
      this._elevationChartTrack = undefined;
      this.trackElevationChartElements = undefined;
    }
    if (this._startEndLayer != null) {
      this.map.removeLayer(this._startEndLayer);
      this._startEndLayer = undefined;
    }
    if (this._trackLayer != null) {
      this.map.removeLayer(this._trackLayer);
      this._trackLayer = undefined;
    }
  }
}
