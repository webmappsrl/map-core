import {
  Directive,
  Input,
  OnChanges,
  SimpleChanges,
  Host,
  Output,
  EventEmitter,
  Renderer2,
} from '@angular/core';
import {WmMapComponent} from '../components/map/map.component';
import {WmMapBaseDirective} from './base.directive';
import Polygon from 'ol/geom/Polygon';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {Fill, Stroke, Style} from 'ol/style';
import {filter, take} from 'rxjs/operators';
import Overlay from 'ol/Overlay.js';
import {WmFeature} from '@wm-types/feature';
import {MultiPolygon} from 'geojson';
import {toLonLat} from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry} from 'ol/geom';
import {Feature, MapBrowserEvent} from 'ol';
import {
  BOX_SIZE_VMIN,
  FEATURE_COLLECTION_ZINDEX,
  TILES_DOWNLOAD_ZOOM_MIN,
} from '@map-core/readonly';

@Directive({
  selector: '[wmMapTilesDownload]',
})
export class WmMapTilesDownloadDirective extends WmMapBaseDirective implements OnChanges {
  private _vectorSource: VectorSource;
  private _vectorLayer: VectorLayer<VectorSource>;
  private _boundingBoxesLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _overlay: Overlay;

  @Input() wmMapTilesDownloadShow: boolean = false;
  @Input() set wmMapTilesBoundingBoxes(boundingBoxes: WmFeature<MultiPolygon>[]) {
    this.mapCmp.isInit$
      .pipe(
        filter(f => f),
        take(1),
      )
      .subscribe(() => {
        this._buildGeojson(boundingBoxes);
      });
  }
  @Output() wmMapTilesBoundingBox: EventEmitter<WmFeature<MultiPolygon>> = new EventEmitter<
    WmFeature<MultiPolygon>
  >();
  @Output() wmMapTilesZoomDisableDownloadButton: EventEmitter<boolean> =
    new EventEmitter<boolean>();
  @Output() wmMapTilesDelete: EventEmitter<string> = new EventEmitter<string>();

  constructor(@Host() mapCmp: WmMapComponent, private _renderer: Renderer2) {
    super(mapCmp);

    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this._init();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.wmMapTilesDownloadShow) {
      if (this.wmMapTilesDownloadShow) {
        this._zoomIn();
        this._addTargetAreaOverlay();
        this.mapCmp?.map?.on('moveend', this._checkZoomDisableDownloadButton);
        this._boundingBoxesLayer?.setVisible(true);
      } else {
        this.wmMapTilesBoundingBox.emit(null);
        this._removeTargetAreaOverlay();
        this._vectorSource?.clear();
        this.mapCmp?.map?.un('moveend', this._checkZoomDisableDownloadButton);
        this._boundingBoxesLayer?.setVisible(false);
      }
    }
  }

  onClick(evt: MapBrowserEvent<UIEvent>): void {
    const map = this.mapCmp.map;
    const features = map.getFeaturesAtPixel(evt.pixel, {
      layerFilter: layer => layer === this._boundingBoxesLayer,
    });

    if (features && features.length > 0) {
      const topFeature = features[0];
      this._toggleBoundingBoxDeleteButton(topFeature as Feature<Geometry>);
    }
  }

  private _init(): void {
    this._vectorSource = new VectorSource();
    this._vectorLayer = new VectorLayer({
      source: this._vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(0,0,255,0.1)',
        }),
      }),
    });
    this.mapCmp.map.addLayer(this._vectorLayer);
  }

  private _getViewportBoxPolygon(): Polygon {
    const mapSize = this.mapCmp.map.getSize();
    if (!mapSize) throw new Error('Map not ready');

    const [mapWidth, mapHeight] = mapSize;
    const vmin = Math.min(mapWidth, mapHeight) / 100;
    const boxSize = BOX_SIZE_VMIN * vmin;
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    const topLeft = [centerX - boxSize / 2, centerY - boxSize / 2];
    const topRight = [centerX + boxSize / 2, centerY - boxSize / 2];
    const bottomRight = [centerX + boxSize / 2, centerY + boxSize / 2];
    const bottomLeft = [centerX - boxSize / 2, centerY + boxSize / 2];

    const coords = [
      this.mapCmp.map.getCoordinateFromPixel(topLeft),
      this.mapCmp.map.getCoordinateFromPixel(topRight),
      this.mapCmp.map.getCoordinateFromPixel(bottomRight),
      this.mapCmp.map.getCoordinateFromPixel(bottomLeft),
      this.mapCmp.map.getCoordinateFromPixel(topLeft),
    ];

    return new Polygon([coords as [number, number][]]);
  }

  private _addTargetAreaOverlay(): void {
    if (!this._overlay) {
      const overlayElement = document.createElement('div');
      overlayElement.setAttribute('e2e-map-tiles-target-area-overlay', '');
      overlayElement.style.position = 'fixed';
      overlayElement.style.width = `${BOX_SIZE_VMIN}vmin`;
      overlayElement.style.height = `${BOX_SIZE_VMIN}vmin`;
      overlayElement.style.transform = 'translate(-50%, -50%)';
      overlayElement.style.backgroundColor = 'rgba(var(--wm-color-primary-rgb), 0.1)';
      overlayElement.style.borderRadius = '15px';
      overlayElement.style.border = '2px dashed rgba(var(--wm-color-primary-rgb), 0.8)';
      overlayElement.style.cursor = 'pointer';
      overlayElement.style.pointerEvents = 'none';

      this._overlay = new Overlay({
        element: overlayElement,
        positioning: 'center-center',
        stopEvent: false,
      });

      this.mapCmp.map.addOverlay(this._overlay);
      this._updateTargetAreaOverlayPosition();
      this.mapCmp.map.getView().on('change:resolution', this._updateTargetAreaOverlayPosition);
      this.mapCmp.map.on('pointermove', this._updateTargetAreaOverlayPosition);
    }
  }

  private _updateTargetAreaOverlayPosition = () => {
    const mapSize = this.mapCmp.map.getSize();

    if (mapSize) {
      const [mapWidth, mapHeight] = mapSize;
      const centerPixel = [mapWidth / 2, mapHeight / 2];
      const centerCoordinate = this.mapCmp.map.getCoordinateFromPixel(centerPixel);
      this._overlay.setPosition(centerCoordinate);

      // Creazione del WmFeature<MultiPolygon>
      const polygon = this._getViewportBoxPolygon();
      const coordinates = polygon
        .getCoordinates()
        .map(ring => ring.map(coord => toLonLat(coord) as [number, number]));

      const wmFeature: WmFeature<MultiPolygon> = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [coordinates],
        },
        properties: {},
      };

      // Aggiorna l'output
      this.wmMapTilesBoundingBox.emit(wmFeature);
    }
  };

  private _removeTargetAreaOverlay(): void {
    if (this._overlay) {
      this.mapCmp.map.removeOverlay(this._overlay);
      this.mapCmp.map.getView().un('change:resolution', this._updateTargetAreaOverlayPosition);
      this.mapCmp.map.un('pointermove', this._updateTargetAreaOverlayPosition);
      this._overlay = null;
    }
    this._removeAllDeleteOverlays();
  }

  private _removeAllDeleteOverlays(): void {
    const overlays =
      this.mapCmp?.map
        ?.getOverlays()
        ?.getArray()
        ?.filter(o => o.get('id')) || [];

    overlays.forEach(overlay => {
      this.mapCmp.map.removeOverlay(overlay);
    });
  }

  private _removeDeleteOverlayByUuid(uuid: string): void {
    const overlay = this.mapCmp.map
      .getOverlays()
      .getArray()
      .find(o => o.get('id') === `overlay-${uuid}`);
    if (overlay) {
      this.mapCmp.map.removeOverlay(overlay);
    }
  }

  private _zoomIn(): void {
    const zoom = this.mapCmp.map.getView().getZoom();
    if (zoom < TILES_DOWNLOAD_ZOOM_MIN) {
      this.mapCmp.map.getView().animate({
        zoom: TILES_DOWNLOAD_ZOOM_MIN,
        duration: 300,
      });
    }
  }

  private _checkZoomDisableDownloadButton = (): void => {
    const zoom = this.mapCmp.map.getView().getZoom();
    this.wmMapTilesZoomDisableDownloadButton.emit(zoom < TILES_DOWNLOAD_ZOOM_MIN);
  };

  private _buildGeojson(features: WmFeature<MultiPolygon>[]): void {
    if (this._boundingBoxesLayer != null && this._boundingBoxesLayer.getSource() != null) {
      this._boundingBoxesLayer.getSource().clear();
    }
    if (!features || features.length === 0) {
      return;
    }

    const featureCollection = {
      type: 'FeatureCollection',
      features: features,
    };

    let count = 0;
    const featuresGeojson = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(featureCollection);
    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      features: featuresGeojson,
    });

    this._boundingBoxesLayer = new VectorLayer({
      source: vectorSource,
      style: (f: Feature<Geometry>) => {
        f.setId(count);
        count++;
        f.setStyle(this._boundingBoxStyle.bind(this));
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: FEATURE_COLLECTION_ZINDEX,
    });
    if (this.mapCmp.map != null) {
      this.mapCmp.map.addLayer(this._boundingBoxesLayer);
      if (!this.wmMapTilesDownloadShow) {
        this._boundingBoxesLayer.setVisible(false);
      }
      this.mapCmp.registerDirective(this._boundingBoxesLayer['ol_uid'], this);
    }
  }

  private _boundingBoxStyle(feature: Feature): Style {
    const baseStyle = {
      stroke: new Stroke({
        color: 'rgba(231, 67, 58,0.5)',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(231, 240, 58,0.5)',
      }),
    };
    return new Style(baseStyle);
  }

  private _toggleBoundingBoxDeleteButton(feature: Feature<Geometry>): void {
    const map = this.mapCmp.map;
    const geometry = feature.getGeometry();
    if (geometry && geometry.getType() === 'MultiPolygon') {
      const properties = feature.getProperties();
      const uuid = properties.uuid;

      const existingOverlay = map
        .getOverlays()
        .getArray()
        .find(o => o.get('id') === `overlay-${uuid}`);
      if (existingOverlay) {
        this._removeDeleteOverlayByUuid(uuid);
        return;
      }

      this._removeAllDeleteOverlays();
      const buttonElement = this._renderer.createElement('ion-button');
      this._renderer.setAttribute(buttonElement, 'fill', 'clear');
      this._renderer.setAttribute(buttonElement, 'slot', 'icon-only');
      this._renderer.addClass(buttonElement, 'wm-map-delete-bounding-box-button');

      const iconElement = this._renderer.createElement('ion-icon');
      this._renderer.setAttribute(iconElement, 'name', 'trash');
      this._renderer.appendChild(buttonElement, iconElement);

      this._renderer.listen(buttonElement, 'click', () => {
        this._deleteBoundingBox(uuid);
      });

      const extent = geometry.getExtent();
      const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];

      const overlay = new Overlay({
        element: buttonElement,
        position: center,
        positioning: 'center-center',
      });
      overlay.set('id', `overlay-${uuid}`);
      map.addOverlay(overlay);
    }
  }

  private _deleteBoundingBox(uuid: string): void {
    this.wmMapTilesDelete.emit(uuid);
    this._removeDeleteOverlayByUuid(uuid);
  }
}
