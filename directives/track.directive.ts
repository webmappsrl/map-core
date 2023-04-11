import {
  ComponentFactoryResolver,
  Directive,
  ElementRef,
  Host,
  Input,
  OnChanges,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';
import {WmMapComponent} from '../components';
import {WmMapPopover} from './../components/popover/popover.map';
import {PinchRotate} from 'ol/interaction';
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

import {WmMapBaseDirective} from '.';
import {
  endIconHtml,
  FLAG_TRACK_ZINDEX,
  POINTER_TRACK_ZINDEX,
  SELECTED_TRACK_ZINDEX,
  startIconHtml,
} from '../readonly';
import {ILineString} from '../types/model';
import {coordsFromLonLat, createIconFeatureFromHtml, getFlowStyle, getLineStyle} from '../utils';
import {getFlowPopoverText} from '../utils/popover';
import {Location} from '../types/location';

@Directive({
  selector: '[wmMapTrack]',
})
export class WmMapTrackDirective extends WmMapBaseDirective implements OnChanges {
  private _elevationChartLayer: VectorLayer<VectorSource>;
  private _elevationChartPoint: Feature<Point>;
  private _elevationChartSource: VectorSource;
  private _elevationChartTrack: Feature<LineString>;
  private _endFeature: Feature<Geometry>;
  private _initTrack = false;
  private _popoverRef: any;
  private _startEndLayer: VectorLayer<VectorSource>;
  private _startFeature: Feature<Geometry>;
  private _trackFeatures: Feature<Geometry>[];
  private _trackLayer: VectorLayer<VectorSource>;

  @Input() track;
  @Input() trackElevationChartElements: any;
  @Input() wmMapTrackColor = '#caaf15';

  constructor(
    private element: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private componentFactoryResolver: ComponentFactoryResolver,
    @Host() mapCmp: WmMapComponent,
  ) {
    super(mapCmp);
  }

  drawTrack(trackgeojson: any): void {
    const isFlowLine = this.wmMapConf.flow_line_quote_show || false;
    const orangeTreshold = this.wmMapConf.flow_line_quote_orange || 800;
    const redTreshold = this.wmMapConf.flow_line_quote_red || 1500;
    const geojson: any = this._getGeoJson(trackgeojson);

    if (isFlowLine) {
      this._initPopover();
    }
    this._trackFeatures = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(geojson);
    this._trackLayer = new VectorLayer({
      source: new VectorSource({
        format: new GeoJSON(),
        features: this._trackFeatures,
      }),
      style: () =>
        isFlowLine ? getFlowStyle(orangeTreshold, redTreshold) : getLineStyle(this.wmMapTrackColor),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: SELECTED_TRACK_ZINDEX,
    });

    this.mapCmp.map.addLayer(this._trackLayer);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const resetCondition =
      (changes.track &&
        changes.track.previousValue != null &&
        changes.track.currentValue != null &&
        changes.track.previousValue.properties.id != changes.track.currentValue.properties.id) ??
      false;
    if (this.track == null || this.mapCmp.map == null || resetCondition) {
      this._resetView();
      this._initTrack = false;
    }
    if (
      this.wmMapConf != null &&
      this.track != null &&
      this.mapCmp.map != null &&
      this._initTrack === false
    ) {
      this._init();
      this._initTrack = true;
    }
    if (this.track != null && this.mapCmp.map != null && this.trackElevationChartElements != null) {
      if (this._popoverRef != null) {
        const altitude = this.trackElevationChartElements?.location.altitude || undefined;
        this._popoverRef.instance.message$.next(
          getFlowPopoverText(
            altitude,
            this.wmMapConf.flow_line_quote_orange,
            this.wmMapConf.flow_line_quote_red,
          ),
        );
      }

      this._drawTemporaryLocationFeature(
        this.trackElevationChartElements?.location,
        this.trackElevationChartElements?.track,
      );
    }
    if (this.mapCmp.map != null && changes.track != null) {
    }
  }

  /**
   * Center the current map view to the current physical location
   */
  private _centerMapToTrack() {
    if (this._trackLayer) {
      const ext = this._trackLayer.getSource().getExtent();
      if (ext) {
        this.mapCmp.map.once('rendercomplete', () => {
          this.mapCmp.map.getView().fit(this._trackLayer.getSource().getExtent(), {
            padding: [80, 80, 80, 80],
            duration: 500,
          });
        });
      }
    }
  }

  private _drawTemporaryLocationFeature(location?: Location, track?: any): void {
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
        this.mapCmp.map.addLayer(this._elevationChartLayer);
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

      this.mapCmp.map.render();
    } else if (this._elevationChartSource && this.mapCmp.map) {
      this._elevationChartPoint = undefined;
      this._elevationChartTrack = undefined;
      this._elevationChartSource.clear();
      this.mapCmp.map.render();
    }
  }

  private _getGeoJson(trackgeojson: any): any {
    if (trackgeojson?.geojson) {
      return trackgeojson.geojson;
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
    this.mapCmp.map.addLayer(this._startEndLayer);
    this.drawTrack(this.track);
    this.mapCmp.map.getInteractions().extend([new PinchRotate()]);
    this._centerMapToTrack();
  }

  private _initPopover(): void {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(WmMapPopover);
    this._popoverRef = this.viewContainerRef.createComponent(componentFactory);
    const host = this.element.nativeElement;
    host.insertBefore(this._popoverRef.location.nativeElement, host.firstChild);
  }

  private _resetView(): void {
    if (this._elevationChartLayer != null) {
      this._elevationChartSource.removeFeature(this._elevationChartPoint);
      this._elevationChartSource.clear();
      this.mapCmp.map.removeLayer(this._elevationChartLayer);
      this._elevationChartLayer = undefined;
      this._elevationChartPoint = undefined;
      this._elevationChartTrack = undefined;
      this.trackElevationChartElements = undefined;
    }
    if (this._startEndLayer != null) {
      this.mapCmp.map.removeLayer(this._startEndLayer);
      this._startEndLayer = undefined;
    }
    if (this._trackLayer != null) {
      this.mapCmp.map.removeLayer(this._trackLayer);
      this._trackLayer = undefined;
    }
    if (this._popoverRef != null) {
      this._popoverRef.instance.message$.next(null);
    }
  }
}
