export interface IDATALAYER {
  high: string;
  low: string;
}
export interface IHIT {
  cai_scale: string;
  distance: string;
  feature_image: string | any;
  id: number;
  layers: number[];
  name: string;
  ref: string;
  size?: any;
  taxonomyActivities: string[];
  taxonomyWheres: string[];
}

export interface ILAYER {
  bbox: [number, number, number, number];
  behaviour: {[name: string]: string};
  data_use_bbox: boolean;
  data_use_only_my_data: boolean;
  description: string;
  icon?: any;
  id: string;
  name: string;
  params?: {[id: string]: string};
  style: {[name: string]: string};
  subtitle: string;
  title: string;
  tracks?: {[name: string]: IHIT[]};
  taxonomy_activities?: any[];
  taxonomy_themes?: any[];
  edges?: {[trackID: string]: {prev: number[]; next: number[]}};
}
