/* eslint-disable @typescript-eslint/naming-convention */
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {Feature} from 'ol';
import Geometry from 'ol/geom/Geometry';
import {ILAYER} from './layer';

export type ILineString = Array<IPoint>;
export type IMultiLineString = Array<Array<IPoint>>;
export type IMultiPolygon = Array<Array<Array<IPoint>>>;
export type IPoint = [number, number, number?];
export type IPolygon = Array<Array<IPoint>>;

export interface ICONTROL {
  label: iLocalString;
  partitionProperties?: any[];
  type: string;
}

export interface ICONTROLS {
  data: (ICONTROLSTITLE | ICONTROLSBUTTON)[];
  overlays: (ICONTROLSTITLE | ICONTROLSBUTTON)[];
  tiles: (ICONTROLSTITLE | ICONTROLSBUTTON)[];
}

export interface ICONTROLSBUTTON extends ICONTROL {
  default?: boolean;
  icon?: string;
  icon_url?: string;
  id?: number;
  type: 'button';
  url?: string;
}

export interface ICONTROLSTITLE extends ICONTROL {
  type: 'title';
}

export interface IGeojsonCluster extends IGeojsonGeneric {
  properties: {
    ids: number[]; // Id di Ec Track che fanno parte del cluster
    images: string[]; // Massimo 3 url di immagini ottimizzate
    bbox: number[]; // Extent di tutte le ec track assieme
  };
  type: 'Feature';
}

export interface IGeojsonClusterApiResponse {
  features: IGeojsonCluster[];
}

/**
 * Define a feature
 */
export interface IGeojsonFeature {
  geometry: IGeojsonGeometry;
  properties: IGeojsonProperties;
  type: 'Feature';
}

export interface IGeojsonFeatureDownloaded extends IGeojsonFeature {
  size: number;
}

export interface IGeojsonGeneric {
  geometry: IGeojsonGeometry;
  properties: any;
  type: string;
}

/**
 * Define the supported geometries
 */
export interface IGeojsonGeometry {
  coordinates: IPoint | ILineString | IMultiLineString | IPolygon | IMultiPolygon;
  type: EGeojsonGeometryTypes;
}

export interface IGeojsonPoi extends IGeojsonGeneric {
  isSmall?: boolean;
  properties: {
    id: number; // Id del poi
    image: string; // url image
  };
  type: 'Point';
}

export interface IGeojsonPoiDetailed extends IGeojsonPoi {
  properties: {
    id: number; // Id del poi
    image: string; // url image
    images: string[]; // url images
    name: ILocaleString;
    description: ILocaleString;
    email?: string;
    phone?: string;
    address?: string;
    url?: string;
  };
}

/**
 * Define the supported properties
 */
export interface IGeojsonProperties {
  ascent?: number;
  audio?: {[lang: string]: string};
  created_at?: Date;
  descent?: number;
  description?: ILocaleString;
  difficulty?: ILocaleString;
  distance?: number;
  distance_comp?: number;
  duration?: {
    hiking?: {
      forward?: number;
      backward?: number;
    };
  };
  duration_backward?: number;
  duration_forward?: number;
  ele_from?: number;
  ele_max?: number;
  ele_min?: number;
  ele_to?: number;
  excerpt?: ILocaleString;
  feature_image?: IWmImage;
  geojson_url?: string;
  gpx_url?: string;
  // allow to work with custom properties when needed
  id: number;
  image?: IWmImage;
  image_gallery?: IWmImage[];
  import_method?: string;
  kml_url?: string;
  mbtiles?: string[];
  name?: ILocaleString;
  related_pois?: IGeojsonFeature[];
  related_url?: {[label: string]: string};
  source?: string;
  source_id?: string;
  taxonomy?: {
    activity?: any[];
    where?: string[];
    poi_type?: any;
  };
  updated_at?: Date;
  user_id?: number;

  [_: string]: any;
}

export interface ILocaleString {
  en?: string;
  it?: string;
}

export interface IMAP {
  attribution?: string | false;
  /**
   * rappresent the bounding box of the map
   */
  bbox: [number, number, number, number];
  center?: [number, number];
  controls: ICONTROLS;
  defZoom: number;
  flow_line_quote_orange: number;
  flow_line_quote_red: number;
  flow_line_quote_show: boolean;
  layers?: ILAYER[];
  maxStrokeWidth: number;
  maxZoom: number;
  minStrokeWidth: number;
  minZoom: number;
  pois?: IPOI;
  ref_on_track_min_zoom: number;
  ref_on_track_show: boolean;
  start_end_icons_min_zoom: number;
  start_end_icons_show: boolean;
  tiles: {[name: string]: string}[];
}

export interface IPOI {
  apppoisApiLayer: boolean;
  poiIconRadius: string;
  poiIconZoom: string;
  poiLabelMinZoom: string;
  poiMaxRadius: string;
  poiMinRadius: string;
  poiMinZoom: string;
  poi_interaction: 'no_interaction' | 'tooltip' | 'popup' | 'tooltip_popup';
  skipRouteIndexDownload: boolean;
  taxonomies: any;
}

export interface IWmImage {
  api_url: string;
  caption: string;
  id: number;
  sizes: {
    '108x148': string;
    '108x137': string;
    '225x100': string;
    '250x150': string;
    '118x138': string;
    '108x139': string;
    '118x117': string;
    '335x250': string;
    '400x200': string;
    '1440x500': string;
  };
  url: string;
}

/**
 * @description
 * @export
 * @interface PoiMarker
 * @extends {iMarker}
 */
export interface PoiMarker extends iMarker {
  poi: WmFeature<Point>;
  style?: any;
}

export interface PoiTypeTaxonomy {
  description: ILocaleString;
  id: number;
  name: ILocaleString;
}

export interface WhereTaxonomy {
  admin_level: number;
  created_at: Date;
  description: string;
  id: 9;
  import_method: string;
  name: ILocaleString;
  source_id: number;
  updated_at: Date;
}

/**
 * @export
 * @interface IMAP
 */
export interface iLocalString {
  en?: string;
  it?: string;
}

/**
 * @description
 * @export
 * @interface iMarker
 */
export interface iMarker {
  icon: Feature<Geometry>;
  id: string;
}

/**
 * @description
 * @export
 * @enum {number}
 */
export enum EGeojsonGeometryTypes {
  POINT = 'Point',
  LINE_STRING = 'LineString',
  MULTI_LINE_STRING = 'MultiLineString',
  POLYGON = 'Polygon',
  MULTI_POLYGON = 'MultiPolygon',
}
