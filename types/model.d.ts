/* eslint-disable @typescript-eslint/naming-convention */
import {Feature} from 'ol';
import Geometry from 'ol/geom/Geometry';
export type IPoint = [number, number, number?];
export type ILineString = Array<IPoint>;
export type IMultiLineString = Array<Array<IPoint>>;
export type IPolygon = Array<Array<IPoint>>;
export type IMultiPolygon = Array<Array<Array<IPoint>>>;

/**
 * Define the supported geometries
 */
export interface IGeojsonGeometry {
  coordinates: IPoint | ILineString | IMultiLineString | IPolygon | IMultiPolygon;
  type: EGeojsonGeometryTypes;
}

export interface ILocaleString {
  en?: string;
  it?: string;
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
  };
  updated_at?: Date;
  user_id?: number;

  [_: string]: any;
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

export interface IGeojsonGeneric {
  geometry: IGeojsonGeometry;
  properties: any;
  type: string;
}
export interface IGeojsonCluster extends IGeojsonGeneric {
  properties: {
    ids: number[]; // Id di Ec Track che fanno parte del cluster
    images: string[]; // Massimo 3 url di immagini ottimizzate
    bbox: number[]; // Extent di tutte le ec track assieme
  };
  type: 'Feature';
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
export interface IGeojsonClusterApiResponse {
  features: IGeojsonCluster[];
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

export interface iMarker {
  icon: Feature<Geometry>;
  id: string;
}
  
  export interface PoiMarker extends iMarker {
  poi: IGeojsonFeature;
  style?: any;
}

export enum EGeojsonGeometryTypes {
    POINT = 'Point',
    LINE_STRING = 'LineString',
    MULTI_LINE_STRING = 'MultiLineString',
    POLYGON = 'Polygon',
    MULTI_POLYGON = 'MultiPolygon',
  }
  