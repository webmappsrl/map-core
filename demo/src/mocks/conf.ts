export const MAP = {
  'defZoom': 6,
  'maxZoom': 22,
  'minZoom': 6,
  'maxStrokeWidth': 6,
  'minStrokeWidth': 3,
  'tiles': [
    {'webmapp': 'https://api.webmapp.it/tiles/{z}/{x}/{y}.png'},
    {'mute': 'http://tiles.webmapp.it/blankmap/{z}/{x}/{y}.png'},
    {
      'satellite':
        'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=0Z7ou7nfFFXipdDXHChf',
    },
  ],
  'bbox': [6.3354458926, 36.3469605955, 18.9916958926, 47.2016340083],
  'layers': [
    {
      'id': 88,
      'name': 'Webmapp test',
      'title': null,
      'subtitle': null,
      'description': null,
      'icon': null,
      'params': null,
      'data_use_bbox': false,
      'data_use_only_my_data': false,
      'rank': 30,
      'bbox': ['9.67962', '40.35897', '10.42537', '43.86076'],
      'query_string': '&taxonomyThemes=webmapp',
      'taxonomy_themes': [
        {
          'id': 44,
          'created_at': '2022-08-07T05:22:05.000000Z',
          'updated_at': '2022-12-10T07:49:25.000000Z',
          'user_id': 2,
          'name': {'it': 'Webmapp', 'es': null},
          'description': {'es': null},
          'excerpt': {'es': null},
          'import_method': null,
          'source_id': null,
          'source': null,
          'identifier': 'webmapp',
          'icon': null,
          'color': null,
          'zindex': null,
          'feature_image': 5259,
          'stroke_width': '2.5',
          'stroke_opacity': null,
          'line_dash': null,
          'min_visible_zoom': '5',
          'min_size_zoom': '15',
          'min_size': '1',
          'max_size': '2',
          'icon_zoom': '15',
          'icon_size': '1.7',
          'pivot': {
            'taxonomy_themeable_id': 88,
            'taxonomy_theme_id': 44,
            'taxonomy_themeable_type': 'App\\Models\\Layer',
          },
        },
      ],
      'taxonomy_activities': [],
      'taxonomy_wheres': [],
      'style': {
        'color': null,
        'fill_color': null,
        'fill_opacity': null,
        'stroke_width': null,
        'stroke_opacity': null,
        'zindex': null,
        'line_dash': null,
      },
      'behaviour': {
        'noDetails': false,
        'noInteraction': false,
        'minZoom': null,
        'maxZoom': null,
        'preventFilter': false,
        'invertPolygons': false,
        'alert': false,
        'show_label': false,
      },
      'feature_image':
        'https://ecmedia.s3.eu-central-1.amazonaws.com/EcMedia/Resize/400x200/5259_400x200.jpg',
    },
  ],
  'pois': {
    'apppoisApiLayer': false,
    'skipRouteIndexDownload': true,
    'poiMinRadius': '0.5',
    'poiMaxRadius': '1.2',
    'poiIconZoom': '16',
    'poiIconRadius': '1',
    'poiMinZoom': '13',
    'poiLabelMinZoom': '10.5',
    'taxonomies': [],
    'poi_interaction': 'popup',
  },
  'start_end_icons_show': false,
  'start_end_icons_min_zoom': 10,
  'ref_on_track_show': false,
  'ref_on_track_min_zoom': 10,
  'record_track_show': true,
  'alert_poi_show': true,
  'alert_poi_radius': 100,
  'flow_line_quote_show': false,
  'flow_line_quote_orange': 800,
  'flow_line_quote_red': 1500,
};
