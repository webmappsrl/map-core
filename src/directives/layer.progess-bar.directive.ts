import {
  Directive,
  ElementRef,
  EventEmitter,
  OnChanges,
  OnInit,
  Output,
  Renderer2,
  Host,
  SimpleChanges,
} from '@angular/core';
import {WmMapComponent} from '../components';
import VectorTileLayer from 'ol/layer/VectorTile';

import {WmMapBaseDirective} from '.';

@Directive({
  selector: '[wmMapLayerProgessBar]',
})
export class WmMapLayerProgressBarDirective
  extends WmMapBaseDirective
  implements OnChanges, OnInit
{
  private _ionProgress: any;
  private _mapIsInit = false;
  private _vectorTiles: VectorTileLayer[] = [];

  @Output() trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  constructor(
    private _elRef: ElementRef,
    private _renderer: Renderer2,
    @Host() mapCmp: WmMapComponent,
  ) {
    super(mapCmp);
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.mapCmp.map != null && this.wmMapConf != null && this._mapIsInit == false) {
      this._mapIsInit = true;
      this._vectorTiles = this.mapCmp.map
        .getLayers()
        .getArray()
        .filter(l => l instanceof VectorTileLayer) as VectorTileLayer[];

      this._vectorTiles.forEach(vt => {
        vt.getSource().on(['tileloadstart'], () => {
          const properties = vt.getProperties();
          let currentLoading = properties['loading'] || 0;
          properties['loading'] = ++currentLoading;
          vt.setProperties(properties);
          this._updateProgressBar();
        });
        vt.getSource().on(['tileloadend', 'tileloaderror'], () => {
          const properties = vt.getProperties();
          let currentLoaded = properties['loaded'] || 0;
          properties['loaded'] = ++currentLoaded;
          vt.setProperties(properties);
          this._updateProgressBar();
        });
      });
      this._updateMap();
    }
  }

  ngOnInit(): void {
    this._initProgressBar();
  }

  private _initProgressBar(): void {
    this._ionProgress = this._renderer.createElement('ion-progress-bar');
    this._ionProgress.setAttribute('value', '1');
    this._renderer.setStyle(this._ionProgress, 'position', 'absolute');
    this._renderer.setStyle(this._ionProgress, 'top', '0');
    this._renderer.setStyle(this._ionProgress, 'z-index', '10000');
    this._renderer.setStyle(this._ionProgress, 'left', '0');
    this._renderer.setStyle(this._ionProgress, 'right', '0');
    this._renderer.setStyle(this._ionProgress, 'width', '0%');
    this._renderer.appendChild(this._elRef.nativeElement.parentNode, this._ionProgress);
  }
  /**
   * @description
   * This is a private method named _updateMap() that takes no parameters and returns nothing (void).
   * It calls the updateSize() method on the map object of the mapCmp property.
   * @private
   * @memberof WmMapLayerProgressBarDirective
   */
  private _updateMap(): void {
    this.mapCmp.map.updateSize();
  }
  /**
   * @description
   * This function updates a progress bar.
   * It first filters the vector tiles to find the one that is visible and has an opacity of 1.
   * It then gets the properties of this vector tile, which includes 'loaded' and 'loading'.
   * The range is calculated by dividing loaded by loading and multiplying it by 100.
   * The width of the progress bar is set to this range.
   * If loaded is equal to loading, the color of the progress bar is set to success and it becomes hidden after 1 second.
   * Otherwise, the color is set to primary and it remains visible.
   * Finally, this function calls an updateMap() function.
   * @private
   * @memberof WmMapLayerProgressBarDirective
   */
  private _updateProgressBar(): void {
    const currentVectorTile = this._vectorTiles.filter(
      vf => vf.getVisible() == true && vf.getOpacity() === 1,
    )[0];
    const currentVectorTileProperties = currentVectorTile.getProperties();
    let loaded = currentVectorTileProperties['loaded'];
    let loading = currentVectorTileProperties['loading'];

    const range = +((loaded / loading) * 100).toFixed(0);
    this._ionProgress.style.width = `${range}%`;

    if (loaded === loading) {
      this._ionProgress.setAttribute('color', 'success');
      setTimeout(() => {
        this._ionProgress.style.visibility = 'hidden';
      }, 1000);
    } else {
      this._ionProgress.setAttribute('color', 'primary');
      this._ionProgress.style.visibility = 'visible';
    }
    this._updateMap();
  }
}
