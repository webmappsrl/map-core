# Changelog

## [2.0.0](https://github.com/webmappsrl/map-core/compare/v1.2.0...v2.0.0) (2026-02-24)


### ⚠ BREAKING CHANGES

* **hit-map:** None
* **layer.directive:** The constant `MAP_ZOOM_ON_CLICK_TRESHOLD` has been added to define the threshold for zooming on click. The constant `DEF_ZOOM_ON_CLICK` has been added to define the default zoom level when clicking on the map.

### Features

* Add fitView caller parameter to WmMapBaseDirective ([f850a1a](https://github.com/webmappsrl/map-core/commit/f850a1a5cb057fbec7a93e0891132b414e5034dc))
* add Google Maps navigation to POIs ([c9d2831](https://github.com/webmappsrl/map-core/commit/c9d2831d2d4f0c11226d073fbdba33ec89883470))
* Add style update for selected feature in WmMapFeatureCollectionDirective ([b08b1e2](https://github.com/webmappsrl/map-core/commit/b08b1e2a6363197e75c47dc5bda2beed1a518cf1))
* Add support for creating POI markers from FeatureCollection oc: 2534 ([d7c7493](https://github.com/webmappsrl/map-core/commit/d7c74931d7944f66718287485a895dda5048a818))
* Add support for MultiPolygon and GeometryCollection styles ([c350978](https://github.com/webmappsrl/map-core/commit/c3509783bda1a8895504358ae4606d038a26b4ee))
* Add wmMapFeatureCollectionPopup event ([707fb22](https://github.com/webmappsrl/map-core/commit/707fb22aec7103943b7c3040f355b13850a86029))
* Add wmMapGeojsonFit input to WmMapGeojsonDirective ([f186066](https://github.com/webmappsrl/map-core/commit/f1860663437cc9ac06930f56e5f912bee64fd528))
* Aggiunta della funzione reset in WmMapControls e integrazione nel hit-map.directive ([e52aaed](https://github.com/webmappsrl/map-core/commit/e52aaed2954bce0b7b3aac8159d7566edf42739e))
* **controls.map:** Add logic to initialize data when it changes ([b23d34a](https://github.com/webmappsrl/map-core/commit/b23d34ae3af464337620f4db01ea67464e8c7477))
* **controls:** select default overlay on initialization oc:2880 ([28380b6](https://github.com/webmappsrl/map-core/commit/28380b6afb8947857133f30d35e1c4a865433955))
* **directive:** ✨ add WmMapTrackRecordDirective for tracking locations on the map ([#53](https://github.com/webmappsrl/map-core/issues/53)) ([47dde21](https://github.com/webmappsrl/map-core/commit/47dde21ba48c373870a351b06d9a2faac5433213))
* **directive:** ✨ implement hover feature highlighting in map layer ([8adb8f1](https://github.com/webmappsrl/map-core/commit/8adb8f1316c7ce718a38dc86182e8326496a4fd1))
* **directive:** ✨ implement hover feature highlighting in map layer ([#55](https://github.com/webmappsrl/map-core/issues/55)) ([bb9232d](https://github.com/webmappsrl/map-core/commit/bb9232ddb8bf80f9650ed4c4fb9db7b8f8542777))
* **directive:** add createArrowStyle function ([1426d57](https://github.com/webmappsrl/map-core/commit/1426d57cff59c2efe9298577ad04de8735c1efab))
* **directives:** ✨ add configurable zoom features in viewport ([#41](https://github.com/webmappsrl/map-core/issues/41)) ([c36f3b0](https://github.com/webmappsrl/map-core/commit/c36f3b0da9fac07c7bcd3016076679a2a2622a04))
* Emit events for feature collection layer selection and popup ([4a4a275](https://github.com/webmappsrl/map-core/commit/4a4a2755adb357745a59e1886b42ce9980f83180))
* enhance feature selection in map directive deadline:82 ([4fd82f4](https://github.com/webmappsrl/map-core/commit/4fd82f493aab5234b53ddd1b93b66712e361a904))
* **hit-map:** add hit map directive ([b521e77](https://github.com/webmappsrl/map-core/commit/b521e771892996ea474c80a36fc4ad022eb48bc5))
* **hit-map:** add hit map directive ([8872571](https://github.com/webmappsrl/map-core/commit/88725712ecf867d10451db5ec65ee0935c2e442c))
* **hit-map:** add new TileLayer with updated properties ([d1e1f9f](https://github.com/webmappsrl/map-core/commit/d1e1f9f74731349142b39198c52b6eb82cac3d62))
* **hit-map:** emit empty click event ([3ec7660](https://github.com/webmappsrl/map-core/commit/3ec7660d531ab0771eee8e08bcd853cf34b368d6))
* introduce minimum radius for map features ([3d240c1](https://github.com/webmappsrl/map-core/commit/3d240c18d5f5753b3394ecb8c47194a19eb73b59))
* **layer.directive:** add zoom on click functionality ([3dfedf5](https://github.com/webmappsrl/map-core/commit/3dfedf5815a9ac9edd44d4ed6066ca756e5ec732)), closes [#123](https://github.com/webmappsrl/map-core/issues/123)
* **map.component:** add fullscreen control option to map ([bb860b2](https://github.com/webmappsrl/map-core/commit/bb860b2230e926bdf59d22556f531dc4640dad93))
* **map:** ✨ add 'e2e-map-ready' attribute to body on render complete ([#35](https://github.com/webmappsrl/map-core/issues/35)) ([d189285](https://github.com/webmappsrl/map-core/commit/d1892851c5cbd577e34e1d6f3c46fba7859174eb))
* **pois.directive:** Improve zoom behavior when rendering complete ([21ca4f3](https://github.com/webmappsrl/map-core/commit/21ca4f38e70d9899fbaf168476a6afa4371df45a))
* **style:** change buildRefStyle logic ([b7aa27c](https://github.com/webmappsrl/map-core/commit/b7aa27cd699aef567923df4cead8d6ba236de208))
* **styles:** ✨ add toggle for track direction arrow ([#40](https://github.com/webmappsrl/map-core/issues/40)) ([def6a35](https://github.com/webmappsrl/map-core/commit/def6a35b23e19f905dbef80a4d6aec60ad0047ea))
* **styles:** add fallback stroke color ([23b12c1](https://github.com/webmappsrl/map-core/commit/23b12c12a6101b93b37e2f3cf43c7a08d136b3a0))
* **track.directive:** Add logic to fit view from bbox when track value changes ([c8817e9](https://github.com/webmappsrl/map-core/commit/c8817e9f0455d19532ad3c283acfcc42380b7fed))
* Update feature-collection directive to handle null popup property ([ff22d09](https://github.com/webmappsrl/map-core/commit/ff22d0972b8729e1f7629ee700ddafb6badc16e0))
* Update styles.ts ([ea9d2c3](https://github.com/webmappsrl/map-core/commit/ea9d2c371573df650c252cc79ee21db3e89d0970))
* **utils:** ✨ add maxZoom parameter to initVectorTileLayer function ([6ac6c6c](https://github.com/webmappsrl/map-core/commit/6ac6c6c4c4bb8a91020939b67a10ca152a9645b0))
* **utils:** update renderBuffer value in initVectorTileLayer function ([e16ff64](https://github.com/webmappsrl/map-core/commit/e16ff649c450772eafbc4c4c249cdd1f4d2e23f0))


### Bug Fixes

* add icon url ([ee05dd2](https://github.com/webmappsrl/map-core/commit/ee05dd2fc317ab84d333e23acb72c76a78858625))
* buildArrow oc:5527 ([939f417](https://github.com/webmappsrl/map-core/commit/939f41778e17fb85fc50fc69b3f71e6e39f6a32a))
* click on layer oc: 5529 ([71242f0](https://github.com/webmappsrl/map-core/commit/71242f038124c8cf8210ef750aef48eab68dfef5))
* **controls:** add scrollable list ([1f6935b](https://github.com/webmappsrl/map-core/commit/1f6935b78d6da2e39d88ec3d537bfe4c1034a752))
* **directive:** 🐛 enhance clicked UGC track identification in map directive ([1467bb7](https://github.com/webmappsrl/map-core/commit/1467bb7c637f2594d8b586603c318ff142d5d9d9))
* **directive:** 🐛 update tile source URL in hit-map directive ([79dcac4](https://github.com/webmappsrl/map-core/commit/79dcac41a54f2530a6d7311e51d5c3b753736a72))
* **directives:** 🐛 remove redundant _drawUgcPoiIcon call ([8ec2427](https://github.com/webmappsrl/map-core/commit/8ec2427de30f5e2d8f7280d44686537caa62d536))
* empty click ([fc5e006](https://github.com/webmappsrl/map-core/commit/fc5e006ed53d8a190130e5d8530f82bf8d3a2fec))
* **feature-collection.directive:** add selected layer ([15b1951](https://github.com/webmappsrl/map-core/commit/15b1951ddefd5b4313b80893925db8d02b9f8860))
* **feature-collection.directive:** when fc changes reset selected layer ([a599d9a](https://github.com/webmappsrl/map-core/commit/a599d9aef0fd4becbfc657f51045f3eb87e2b6c9))
* Filter out overlays with null or undefined URLs in feature-collection.directive.ts ([44ab323](https://github.com/webmappsrl/map-core/commit/44ab323d7a32621505e93674015b95844e293c3f))
* Filter out overlays with null or undefined URLs in feature-collection.directive.ts ([8742e3a](https://github.com/webmappsrl/map-core/commit/8742e3a1f1ed1f98bf051e1d9dde5a602dbbbc23))
* Fix logic to select a specific point of interest (POI) ([1250612](https://github.com/webmappsrl/map-core/commit/12506120cc3d41b6d66e08dd4d9c6963d9dbb6b0))
* Handle null values in getStyle method ([7e14d60](https://github.com/webmappsrl/map-core/commit/7e14d60bbcfba2a4f8d7e9bc2da35e7b344760f9))
* handle null values in taxonomyIdentifiers filter oc: 3572 ([aa06579](https://github.com/webmappsrl/map-core/commit/aa06579a525ef2cac1e012010024c74200d082ed))
* handling error ([8cb2990](https://github.com/webmappsrl/map-core/commit/8cb2990bc14ef66a3b7cda73945152aa10b6ce53))
* **layer click:** oc:5537 ([782b790](https://github.com/webmappsrl/map-core/commit/782b7904b227ee71c18526c5f2d038ec0349d582))
* minor fix ([773e8f8](https://github.com/webmappsrl/map-core/commit/773e8f8b540e745e52669095bff43afea97bf7e0))
* modify TRESHOLD_ENABLE_FIT oc: 2885 ([c953844](https://github.com/webmappsrl/map-core/commit/c953844f7cb0362e95b5337584a377025e5654da))
* oc: 5551 ([882b697](https://github.com/webmappsrl/map-core/commit/882b697d061b5880cc47fea6c35b2c33ddb59957))
* oc:5528 ([3b04c2f](https://github.com/webmappsrl/map-core/commit/3b04c2fe0b59d175982be95e9b5e4ae11142c5f7))
* remove line-icon-arrow in all tracks id:2412 ([75d6cd5](https://github.com/webmappsrl/map-core/commit/75d6cd5040dbabd087e431848c548ab90aa094ae))
* return when no features ([8e4629f](https://github.com/webmappsrl/map-core/commit/8e4629fa7280231cc804374d9455302a31b6758f))
* **styles:** 🐛 correct arrow style rotation calculation ([#44](https://github.com/webmappsrl/map-core/issues/44)) ([d24d030](https://github.com/webmappsrl/map-core/commit/d24d030d0d5bb27573efbd051fbf041123250191))
* **styles:** removed unnecessary condition check in buildRefStyle function ([72b75ca](https://github.com/webmappsrl/map-core/commit/72b75ca9935a8427b2ba70ba1fd8263b06a6b53d))
* track selection oc:5551 ([1c5fcfa](https://github.com/webmappsrl/map-core/commit/1c5fcfab72edfe7822c63eb0acaba7ca573b8a0c))
* try catch ([af2f5f2](https://github.com/webmappsrl/map-core/commit/af2f5f2290dace91bc27bf1f33d7ad81b15cf28c))
* update popover ([3141ad4](https://github.com/webmappsrl/map-core/commit/3141ad433df614f98add5557ecd4680203a0c3bd))


### Miscellaneous

* add map attribution ([575ae03](https://github.com/webmappsrl/map-core/commit/575ae0349e0c59e75850b4f69b670a820ec3b359))
* Add wmMapEmptyClickEVT$ output event oc:4585 ([ad190f3](https://github.com/webmappsrl/map-core/commit/ad190f300bb6ae3cfdcf320b4aa13ceebe3ecb57))
* Aggiornamenti e refactoring in diverse direttive e componenti ([749448f](https://github.com/webmappsrl/map-core/commit/749448f86ebcb12ffe68859f754460cdfa8cd357))
* Aggiornamento della funzione removeHitmapFeature per gestire la rimozione delle feature collections ([cef745f](https://github.com/webmappsrl/map-core/commit/cef745f49035dc4b72c7c2ac6201062ff642489e))
* Delay initialization of map controls ([2972b80](https://github.com/webmappsrl/map-core/commit/2972b808013f635f4b98f86791721fc687ccd03c))
* **directive/hit-map:** move check in input setter ([f11200f](https://github.com/webmappsrl/map-core/commit/f11200f2871408fec1c19c19c1441312d9bf0733))
* **directive:** ✨ enhance WmMapTrackRecordDirective to support multiple locations oc: 6889 ([#54](https://github.com/webmappsrl/map-core/issues/54)) ([8cc0a56](https://github.com/webmappsrl/map-core/commit/8cc0a56f8028be62be95899f58f4cc3a9bab003b))
* **directive:** ✨ unify resolution change handling in map layer ([9e8347c](https://github.com/webmappsrl/map-core/commit/9e8347c0244a73db88262d53ef29b170aec54c7f))
* **directives:** ✨ add translation callback for popover message ([a025a5b](https://github.com/webmappsrl/map-core/commit/a025a5be071c7081d779506bf20f04e94b12dda0))
* **directives:** ✨ add UGC drawing directive oc:5655 ([#36](https://github.com/webmappsrl/map-core/issues/36)) ([1b97cbf](https://github.com/webmappsrl/map-core/commit/1b97cbf7c6d5164cc027868d2ce38f90a1c57af4))
* **directives:** ✨ add wmMapDisableFitView input and improve geojson layer handling oc: 5239 ([#47](https://github.com/webmappsrl/map-core/issues/47)) ([1f79851](https://github.com/webmappsrl/map-core/commit/1f79851ecd0a7f4b4db52e79d420862fee70c2bb))
* **directives:** add logic to update POIs layer ([#28](https://github.com/webmappsrl/map-core/issues/28)) ([bb56869](https://github.com/webmappsrl/map-core/commit/bb568692699851821da96071faf94245971fcf51))
* Fix map not updating after resize oc:4825 ([aa9559e](https://github.com/webmappsrl/map-core/commit/aa9559ea69c487f73289335c4622fabd6baf5c5b))
* Fix typo in track.related-pois.directive.ts ([#33](https://github.com/webmappsrl/map-core/issues/33)) ([c7345fd](https://github.com/webmappsrl/map-core/commit/c7345fd2ee33866392bc39c37b565fddc31082f3))
* **hit-map:** add ability to change feature by ID oc:4796 ([98ce388](https://github.com/webmappsrl/map-core/commit/98ce388c5447c09f02d6bbc501b4f358206dc847))
* **hit-map:** add tile layer above existing layer ([ecb1832](https://github.com/webmappsrl/map-core/commit/ecb1832e94f0fda61c2afd0d62762754e37fdb0c))
* **hit-map:** improve hit map feature retrieval ([709ecad](https://github.com/webmappsrl/map-core/commit/709ecad52c161796dac23a5ca7119d185dc2c32d))
* increase timeout for initializing data in WmMapControls ([808bb6b](https://github.com/webmappsrl/map-core/commit/808bb6bfa6ce7d4e21ba379a093cb46e318d60ea))
* map-component css ([3d48049](https://github.com/webmappsrl/map-core/commit/3d480493926eae79d8510b192e3283690bcc88eb))
* **map:** ✨ add toggle for map controls ([#45](https://github.com/webmappsrl/map-core/issues/45)) ([f11eabc](https://github.com/webmappsrl/map-core/commit/f11eabcc072322ed66777aa8d3a27958919f5139))
* **map:** ✨ add zoom to current location feature ([#48](https://github.com/webmappsrl/map-core/issues/48)) ([924a9a0](https://github.com/webmappsrl/map-core/commit/924a9a0c013f969f13fcece43e96371000eac56e))
* **map:** ✨ display tile size on bounding box ([#50](https://github.com/webmappsrl/map-core/issues/50)) ([3dc5e73](https://github.com/webmappsrl/map-core/commit/3dc5e73f2473f880579d50c638564c66971b1992))
* **map:** 🌟 add bounding box download and overlay management oc:5578 ([#49](https://github.com/webmappsrl/map-core/issues/49)) ([569e1a5](https://github.com/webmappsrl/map-core/commit/569e1a5c932e5f4c84dee1c81b59765e55dfb0de))
* **map:** 🗺️ improve POI cluster handling for better zoom experience ([#52](https://github.com/webmappsrl/map-core/issues/52)) ([8c74695](https://github.com/webmappsrl/map-core/commit/8c7469575648513ddf92fbaf42c2bfae41b56dc5))
* **map:** enable pinch rotation on map component ([#29](https://github.com/webmappsrl/map-core/issues/29)) ([b4837c8](https://github.com/webmappsrl/map-core/commit/b4837c83f6ac9fa63f2a85a9e42c46b1cbb2fc89))
* Refactor color selection logic for stroke styles in styleCoreFn ([#20](https://github.com/webmappsrl/map-core/issues/20)) ([8e93a96](https://github.com/webmappsrl/map-core/commit/8e93a964e3c81e4ed62655af70ef2b89cf40c8a6))
* Refactor controls.map.html layout ([e1fff86](https://github.com/webmappsrl/map-core/commit/e1fff86852af8c4b09cfad5e31d110dd33d9133d))
* Refactor feature collection directive ([74cb612](https://github.com/webmappsrl/map-core/commit/74cb6122b6344d6771950f6ef6b3313acdacff6c))
* Refactor feature collection directive ([f048d77](https://github.com/webmappsrl/map-core/commit/f048d776f5c316783d5bbf78996d2de1fc010dc6))
* Refactor layer directive click event handling for vector tile layers. Check for features before zoom action. ([#23](https://github.com/webmappsrl/map-core/issues/23)) ([8034792](https://github.com/webmappsrl/map-core/commit/8034792195a62563d4ed58aa5944c9a1d19d44df))
* Refactor layer.directive.ts ([d22b5f9](https://github.com/webmappsrl/map-core/commit/d22b5f9d93a9cd83af60dd6b20f5d3c55978a5be))
* refactor layer.directive.ts onClick method ([371bc4f](https://github.com/webmappsrl/map-core/commit/371bc4f1a297316394e86c8834a935d1c43db360))
* Refactor map centering logic in track directive ([3e0dc63](https://github.com/webmappsrl/map-core/commit/3e0dc63da5e6ba88ec858a352290c913d1d9e378))
* Refactor stroke color handling in styleCoreFn ([50c3923](https://github.com/webmappsrl/map-core/commit/50c3923ff977852b72ebdb930025af25f944e594))
* Refactor styleCoreFn in styles.ts ([dd62dbc](https://github.com/webmappsrl/map-core/commit/dd62dbcea8ac9e9c96dee74247dd41a32f71a8ee))
* Refactor styleCoreFn in styles.ts deadline:82 ([948c728](https://github.com/webmappsrl/map-core/commit/948c7282d33829b157add1a6d07d98a04aa0ac5e))
* Refactor styleCoreFn in styles.ts oc:3846 ([6f31d15](https://github.com/webmappsrl/map-core/commit/6f31d15ed7dafad9c1fc1f1b35f6ccf978fd48f1))
* Refactor track.directive.ts and track.related-pois.directive.ts ([cc3b2b1](https://github.com/webmappsrl/map-core/commit/cc3b2b11c25fdfe73d494ffd61219be5c2b3acc8))
* Refactor track.related-pois.directive.ts ([9ff792e](https://github.com/webmappsrl/map-core/commit/9ff792e03b251b3e825c386b189effd9e4a9bfba))
* Remove cacheSize option from tile sources ([a0e0b9a](https://github.com/webmappsrl/map-core/commit/a0e0b9a574ad43a9a8035a3a338f1dfd164daebc))
* Remove console.log and console.group statements ([184e3ee](https://github.com/webmappsrl/map-core/commit/184e3ee67fcc0d787f52ea3453f4fb5f92780e5d))
* Remove console.log and refactor event listener in WmMapPoisDirective ([3f0c335](https://github.com/webmappsrl/map-core/commit/3f0c3358b343d1b6fde4223e546cdb7a80768b80))
* Remove console.log statement and refactor icon style in pois.directive.ts ([1039905](https://github.com/webmappsrl/map-core/commit/1039905404a2baf11b49c1fea5d101951a1769f4))
* Remove console.log statement in _handleWmMapPaddingChange method ([ec0760d](https://github.com/webmappsrl/map-core/commit/ec0760d7b172cbd10fb9a66d596b428348101cb3))
* Remove console.log statements in layer.directive.ts ([5382815](https://github.com/webmappsrl/map-core/commit/53828156d2e69f8d88786a59d1b1382dd0bf6f27))
* Remove padding from fitView options in WmMapTrackDirective ([900cccc](https://github.com/webmappsrl/map-core/commit/900cccc38e8fe21d4a31f13bf46bc5b19165d96d))
* Remove redundant code in base.directive.ts and track.directive.ts ([6cc830e](https://github.com/webmappsrl/map-core/commit/6cc830e2b9147fe20d4218d8739db68328d55f43))
* Remove unnecessary alert message in layer directive ([a83fd19](https://github.com/webmappsrl/map-core/commit/a83fd194c3eb7a35f7dd8114b757bb5d973da438))
* Remove unnecessary code and add alert message ([a3a66f0](https://github.com/webmappsrl/map-core/commit/a3a66f0ae87eeda2614d82e8a2b9b070b1a520d4))
* Remove unnecessary code in feature-collection.directive.ts ([0061e8d](https://github.com/webmappsrl/map-core/commit/0061e8de8924391ea9939f645ef82b842a78327a))
* Remove unnecessary code in pois.directive.ts ([a7d384a](https://github.com/webmappsrl/map-core/commit/a7d384a6f313ecffc8026c5124cfb5c48477089b))
* Remove unnecessary code in track.directive.ts ([b4cc460](https://github.com/webmappsrl/map-core/commit/b4cc460f71d936034cbd2b445395679f9c0b3a91))
* Remove unnecessary condition in fitViewFromLonLat oc: 4143 ([#25](https://github.com/webmappsrl/map-core/issues/25)) ([91e789e](https://github.com/webmappsrl/map-core/commit/91e789e207111140d5f40eb7a690441107064856))
* Remove unnecessary event listener and refactor code in layer.directive.ts ([6179ca5](https://github.com/webmappsrl/map-core/commit/6179ca509ad75705e5231d9974641413129e51ba))
* Remove unused code and improve arrow style in track.directive.ts ([73b7750](https://github.com/webmappsrl/map-core/commit/73b775094962c1ce6e7c454a90a409ecf63d244a))
* Remove unused import and update method signature ([2f5af48](https://github.com/webmappsrl/map-core/commit/2f5af48dd08046c662cfa660eeaca826c0bdb053))
* Remove unused imports and types in pois.directive.ts ([5638131](https://github.com/webmappsrl/map-core/commit/56381316197c5d4a119963bb9ed5f01ca411d673))
* Remove unused imports and update types in feature-collection.directive.ts and localForage.ts ([83359a7](https://github.com/webmappsrl/map-core/commit/83359a70e78dbc542d1b855d36c4304e069fa635))
* Remove unused private method _checkZoom ([d8478a9](https://github.com/webmappsrl/map-core/commit/d8478a983e7a2f5ccd18284aff5c7009cdb7cf2d))
* Remove unused url input setter in overlay directive oc: 4098 ([#24](https://github.com/webmappsrl/map-core/issues/24)) ([9816779](https://github.com/webmappsrl/map-core/commit/98167790e927664da49db0a3572b81455dac5ddf))
* Remove unused variables and functions ([50daadf](https://github.com/webmappsrl/map-core/commit/50daadf8f70d10e95814436670dc6bb1aa7c9317))
* Rename files and update component names ([611ef99](https://github.com/webmappsrl/map-core/commit/611ef9983892df3f5d1af025bcd39e1a02de225e))
* Update .gitignore and VSCode settings ([e892aed](https://github.com/webmappsrl/map-core/commit/e892aedd8fc9034218af2c9e51df16808e6060c8))
* Update base.directive.ts to include 'poi' in the condition for fitting ([695ed0a](https://github.com/webmappsrl/map-core/commit/695ed0abf1ca959c593f56e88fbb6fe430279180))
* Update buildArrowStyle function to include an optional circle parameter ([75d6cd5](https://github.com/webmappsrl/map-core/commit/75d6cd5040dbabd087e431848c548ab90aa094ae))
* Update buildRefStyle function in styles.ts ([cc72f99](https://github.com/webmappsrl/map-core/commit/cc72f9992cda9b1b397ae9e260e454a2683c7229))
* Update button.controls.map.ts and map-core.actions.ts oc: 3825 ([7322993](https://github.com/webmappsrl/map-core/commit/73229931e09b9631b21bc8497f1d2323478b40dd))
* Update controls.map.html ([e3c3a1f](https://github.com/webmappsrl/map-core/commit/e3c3a1f439d4d916fec8d41b45f7d9ae16c3aaa6))
* Update controls.map.html and controls.map.ts ([524cc03](https://github.com/webmappsrl/map-core/commit/524cc03cfa4a21c73ee93279390aa3c01596c351))
* Update controls.map.scss ([7eca459](https://github.com/webmappsrl/map-core/commit/7eca459079f21e3ebd5408703b600ac7bfaa8bcd))
* Update controls.map.scss ([a0ae6d8](https://github.com/webmappsrl/map-core/commit/a0ae6d836de8d0777cb4aa9ba9d22cb4c7e7beed))
* Update custom-tracks.draw.directive.ts ([77c8e94](https://github.com/webmappsrl/map-core/commit/77c8e9425a2c54a43e1f69a4f9992cbf0bd6fce0))
* Update custom-tracks.draw.directive.ts oc:4569 ([f4dd251](https://github.com/webmappsrl/map-core/commit/f4dd251d68b39b4c570c3166184b00743b8081e3))
* Update dependencies and add route functionality ([6e346ce](https://github.com/webmappsrl/map-core/commit/6e346ce2f32bbe0d07e17a7625cdd84ea3611ae4))
* Update feature collection and style handling ([5925ac8](https://github.com/webmappsrl/map-core/commit/5925ac8ac2238be735931892c8ecdcdcbd02ccae))
* Update feature-collection.directive.ts ([fd4b6c0](https://github.com/webmappsrl/map-core/commit/fd4b6c0d794fb910c31d563b39586ecb3b18151b))
* Update feature-collection.directive.ts ([51d670d](https://github.com/webmappsrl/map-core/commit/51d670d2b263f59b0b277bbe7392717132b41458))
* Update hit-map directive styling ([bef3b51](https://github.com/webmappsrl/map-core/commit/bef3b516d35e077ab940bc32a2c25073dce1bdf7))
* Update hit-map.directive.ts ([f2be93a](https://github.com/webmappsrl/map-core/commit/f2be93af76f528ea0e0891b7bc2ca9338872a208))
* Update import paths for map-core and wm-types ([117fefb](https://github.com/webmappsrl/map-core/commit/117fefbe26da5f86a5ad213194cc551cfd162047))
* Update layer and cluster z-index values oc: 4011 ([fa9b135](https://github.com/webmappsrl/map-core/commit/fa9b1351b16555aaee9ba41ec26700057bb946e9))
* Update layer and track directives ([655bbc8](https://github.com/webmappsrl/map-core/commit/655bbc84d43bb0f731312b3f3621caaeb679a319))
* Update layer visibility in map directives ([24e9047](https://github.com/webmappsrl/map-core/commit/24e9047a1f52304abf54a97d599680e6d403ac62))
* Update layer.directive.ts ([225d2d5](https://github.com/webmappsrl/map-core/commit/225d2d5a7a9f2d640da2877f34408922078d1751))
* Update layer.directive.ts ([aa90b32](https://github.com/webmappsrl/map-core/commit/aa90b32028104af16ef801496a900496284aff4f))
* Update layer.directive.ts ([b173b56](https://github.com/webmappsrl/map-core/commit/b173b56d7a8e1d847b8119016a28f6c108998783))
* Update layer.directive.ts ([88473f0](https://github.com/webmappsrl/map-core/commit/88473f023a166c5d57c01e937e1309da2fcd0f38))
* Update layer.directive.ts and constants.ts oc: 5363 ([#32](https://github.com/webmappsrl/map-core/issues/32)) ([1f27535](https://github.com/webmappsrl/map-core/commit/1f2753531090c9696e7dd8b797347fd6604209b9))
* Update layer.directive.ts to delay fitting view from lon/lat ([4a90008](https://github.com/webmappsrl/map-core/commit/4a90008e1da90f94aa5ac31e57e369e9861f5267))
* Update layer.directive.ts to handle click events and retrieve feature properties ([c37c4b4](https://github.com/webmappsrl/map-core/commit/c37c4b4a2f30f14c7b2f8e37088ceedbc9fbb564))
* Update layer.directive.ts to include map update ([a1b7a7a](https://github.com/webmappsrl/map-core/commit/a1b7a7abcb2012a6debdc754df6193c9d6be140b))
* Update map and pois directive ([cb08f29](https://github.com/webmappsrl/map-core/commit/cb08f297f6d496d1204d1d1be0633b469ffb4408))
* Update map animation duration to 1500 milliseconds ([5cda2c5](https://github.com/webmappsrl/map-core/commit/5cda2c5b9675b263d8989efbb770397f76d92bca))
* Update map component and controls map ([62a4086](https://github.com/webmappsrl/map-core/commit/62a40868b097977cd1e6f531432d06fc5ecbd3f6))
* Update map component and track related pois directive ([4e6d211](https://github.com/webmappsrl/map-core/commit/4e6d21155562c59b0499b1da8ac63cf21434b34a))
* Update map component HTML and SCSS files ([3cab485](https://github.com/webmappsrl/map-core/commit/3cab4853837af82e071fe44d15b75ef34e21f865))
* Update map component styles ([6cad26c](https://github.com/webmappsrl/map-core/commit/6cad26cb6c658be994e386d370f92c64c1300b4d))
* Update map component styles ([65bf02f](https://github.com/webmappsrl/map-core/commit/65bf02fb44c192529b8c670ca936a9a3ec66c0f7))
* Update map-core.actions.ts ([650b194](https://github.com/webmappsrl/map-core/commit/650b194226c9b1175ba8cc0781fd698a166e6166))
* Update map.component.ts ([77fff18](https://github.com/webmappsrl/map-core/commit/77fff18b96eebea3d9eaea997447ff6e575ef25d))
* Update map.component.ts ([9540da3](https://github.com/webmappsrl/map-core/commit/9540da343984fb0ad0dcd21d5345fed49e36a5a5))
* Update map.component.ts ([b1cae5c](https://github.com/webmappsrl/map-core/commit/b1cae5c95844c21d976732cfd4ab3b35e4b2a110))
* Update map.component.ts and custom-tracks.draw.directive.ts oc: 4475 ([#27](https://github.com/webmappsrl/map-core/issues/27)) ([8170ad0](https://github.com/webmappsrl/map-core/commit/8170ad0a87b69f29880fa543d346d7d37fb0ec6c))
* Update pois.directive.ts ([35e9a4c](https://github.com/webmappsrl/map-core/commit/35e9a4cf538cb89db251445ddab9ac594626cb50))
* Update pois.directive.ts oc:4685 ([0d5098f](https://github.com/webmappsrl/map-core/commit/0d5098f9ae4b2be41f1ca5d1616bef8ae33d6e36))
* Update stroke width adjustments in styleCoreFn function. Adjust minStrokeWidth values by 2 instead of 10 and 20 for better rendering consistency. ([3f9fc7f](https://github.com/webmappsrl/map-core/commit/3f9fc7f58015da96f67e1b8396e4a67e16a2aaac))
* Update styles.ts ([7d06326](https://github.com/webmappsrl/map-core/commit/7d06326cd97b7ed27c20e612745d94977e0f4fbf))
* Update subproject ([e779b79](https://github.com/webmappsrl/map-core/commit/e779b79aa2169593e4bfdbd07c113f1c50b7a772))
* Update subproject ([8c4ac21](https://github.com/webmappsrl/map-core/commit/8c4ac2163b868feb7f1caeaaafe07ea2490b4803))
* Update subproject ([28c2aa8](https://github.com/webmappsrl/map-core/commit/28c2aa8b5f5a55edf910cd0e8669299038053944))
* Update subproject ([912bdd5](https://github.com/webmappsrl/map-core/commit/912bdd594f4235269398da5af59acb49f2aec6b2))
* Update subproject button.controls.map.scss, button.controls.map.ts, controls.map.html, controls.map.ts, map.component.html, map.component.ts, feature-collection.directive.ts and model.ts ([4727e52](https://github.com/webmappsrl/map-core/commit/4727e521e2a087f469946a07b2b6e1ccc3a50da1))
* Update subproject routes ([a957015](https://github.com/webmappsrl/map-core/commit/a95701593d60ef57515ca7589b19527f22b9895d))
* Update subproject with new constants OC:3912,3911 ([b984af4](https://github.com/webmappsrl/map-core/commit/b984af43f87d8ab3df28b2aa2e949832cb97314d))
* Update toggle logic in controls map component ([5f8978c](https://github.com/webmappsrl/map-core/commit/5f8978cca69111fd677f5fdba4fa5c0c200be0ed))
* Update track.directive.ts ([1afc703](https://github.com/webmappsrl/map-core/commit/1afc703c87bb91cfc8cd2fc2984c6476fce50d07))
* Update track.related-pois.directive.ts ([77cd717](https://github.com/webmappsrl/map-core/commit/77cd717596499b5deb5ff510fb0c166c024c38ae))
* Update track.related-pois.directive.ts ([be87174](https://github.com/webmappsrl/map-core/commit/be8717426240ce2d949e18624ad3737dad8baa4f))
* Update track.related-pois.directive.ts ([766e095](https://github.com/webmappsrl/map-core/commit/766e09533fb2a2a9343aff9e32271392f3793777))
* Update track.related-pois.directive.ts ([#19](https://github.com/webmappsrl/map-core/issues/19)) ([b510bbc](https://github.com/webmappsrl/map-core/commit/b510bbcfc6da55e706c503a88aa78229f301cab1))
* Update ugc-pois.directive.ts ([e1c312e](https://github.com/webmappsrl/map-core/commit/e1c312ec1bbec14dae3d1bd3274dcef1ad7aed60))
* Update ugc-pois.directive.ts ([600aac2](https://github.com/webmappsrl/map-core/commit/600aac2a33e3b2dd9b0479184c984d68fd79cc41))
* Update ugc-pois.directive.ts ([#31](https://github.com/webmappsrl/map-core/issues/31)) ([5604289](https://github.com/webmappsrl/map-core/commit/56042896b2c927e59d8e5c542d0d0d780021a093))
* Update VSCode settings ([766a5c6](https://github.com/webmappsrl/map-core/commit/766a5c6df7427cffcd7b5710dd16f09e092c66bf))
* Update VSCode settings and feature-collection.directive.ts ([ce57dde](https://github.com/webmappsrl/map-core/commit/ce57dded71a508bda9d1f20610b360e64ba2e9ca))
* **utils:** ✨ add distance calculation and optimize arrow filtering oc:5800 ([#46](https://github.com/webmappsrl/map-core/issues/46)) ([dfbcc03](https://github.com/webmappsrl/map-core/commit/dfbcc03533e4200ac9ba22ad4bf1c4a21bf28031))
* **utils:** ✨ add geometry utility for closest point calculation oc:5741 ([7a61de5](https://github.com/webmappsrl/map-core/commit/7a61de56b26b3269d826cf48eee443645af4b53d))

## [1.2.0](https://github.com/webmappsrl/map-core/compare/v1.1.1...v1.2.0) (2023-10-31)


### Features

* Add support for data buttons in map controls ([299a303](https://github.com/webmappsrl/map-core/commit/299a303bcb526dd034b332c33545e80e98e1ee9b))
* **directives:** add fill color to feature collection directive ([9af86d8](https://github.com/webmappsrl/map-core/commit/9af86d807e18cec585dc532887480cd888d6d14f)), closes [#1875](https://github.com/webmappsrl/map-core/issues/1875)


### Bug Fixes

* Add click interaction for feature collection and pois directives ([e788001](https://github.com/webmappsrl/map-core/commit/e788001a731b4a96da75c3ccd0b3751fa98ef3e6))
* Fix bug in feature-collection directive ([87a634a](https://github.com/webmappsrl/map-core/commit/87a634a7b17beeb7daa0a6440a492ef1a75a4382))


### Miscellaneous

* Add controls.map.html and update controls.map.ts ([0823d83](https://github.com/webmappsrl/map-core/commit/0823d8392c96fa671b7abef2a1c5c28cf2f63f5d))
* Refactor controls.map ([299a303](https://github.com/webmappsrl/map-core/commit/299a303bcb526dd034b332c33545e80e98e1ee9b))
* Remove unused code and optimize feature collection directive ([0211cc3](https://github.com/webmappsrl/map-core/commit/0211cc302fe802429a94c0ba57126a4221deba0c)), closes [#1876](https://github.com/webmappsrl/map-core/issues/1876)
* Remove unused code and refactor feature selection logic ([6a5c4a1](https://github.com/webmappsrl/map-core/commit/6a5c4a1ef75b90292c035ded070deb8fc4788840))
* Remove unused code in createHull function ([a5cceda](https://github.com/webmappsrl/map-core/commit/a5cceda863210373b3a6a10efaec5c835a510d63))
* Update controls.map.html ([cd0ebd9](https://github.com/webmappsrl/map-core/commit/cd0ebd984e4a241e05284943f049f0eefc6962c9))
* Update controls.map.ts to handle empty data and overlays arrays ([980896b](https://github.com/webmappsrl/map-core/commit/980896b7a40f5546dd2f28a0d416d027f5b03c95))
* Update createHull function in ol.ts ([85bc0e9](https://github.com/webmappsrl/map-core/commit/85bc0e973c2b021a725ce7a643b4aec5ff7eb545))
* Update feature-collection.directive.ts ([565db9d](https://github.com/webmappsrl/map-core/commit/565db9dd6a0fd99cf54cec61c55e05cb7f69ed16))
* Update map component, feature collection directive, and pois directive ([4845df6](https://github.com/webmappsrl/map-core/commit/4845df610c91e154f26d365f4031c7829b66ff79))
* Update ol-ext dependency to version 4.0.11 ([a0e8ef9](https://github.com/webmappsrl/map-core/commit/a0e8ef94914948ebc72689f2a7b7e99ecf61a160))
* Update WmMapFeatureCollectionDirective ([e9dbca4](https://github.com/webmappsrl/map-core/commit/e9dbca4210f220c129bf5aa1a35074f8e871b039)), closes [#1876](https://github.com/webmappsrl/map-core/issues/1876)

## [1.1.1](https://github.com/webmappsrl/map-core/compare/v1.1.0...v1.1.1) (2023-10-05)


### Bug Fixes

* Simplify style retrieval logic in styleCoreFn ([be775fd](https://github.com/webmappsrl/map-core/commit/be775fdc51096e2b0cb851270e2da10f56884d2a))


### Miscellaneous

* Update README.md ([ad5bcf6](https://github.com/webmappsrl/map-core/commit/ad5bcf68c227026a3cff79b6b0a85bc7e4b8d506))

## [1.1.0](https://github.com/webmappsrl/map-core/compare/v1.0.5...v1.1.0) (2023-10-03)


### Features

* Add release_please.yml workflow ([e761edd](https://github.com/webmappsrl/map-core/commit/e761edd867199f3db9ac3ad8eb69aae72d26fb8f))
* **control.map:** add map control close ([dae534c](https://github.com/webmappsrl/map-core/commit/dae534cae0669298cd3be7b67cfa2a43f665f07b))
* **demo:** add demo app ([43e3deb](https://github.com/webmappsrl/map-core/commit/43e3deb395032df4b9c47071b61d776604515f44))
* **demo:** added display of information about the selected poi on track related pois page ([2218687](https://github.com/webmappsrl/map-core/commit/22186878d1705ea45b6d27e1ce066289dcbd9219))
* **demo:** added documentation for inputs and outputs for custom tracks page ([61af81e](https://github.com/webmappsrl/map-core/commit/61af81ece9981494548d3eb27fee58b4b10bd0f1))
* **demo:** added documentation for inputs and outputs in component map and directive track ([0591ca1](https://github.com/webmappsrl/map-core/commit/0591ca180c71f228d676b90a6d39b752cd1490b7))
* **demo:** added inputs and outputs documentation for layer and position pages ([40c3e6f](https://github.com/webmappsrl/map-core/commit/40c3e6f30e6dbc20c95558ab458784314d40bdeb))
* **demo:** added inputs and outputs documentation for overlay and track related pois pages ([4412942](https://github.com/webmappsrl/map-core/commit/441294286078e379c36b84c5471d307b1d298982))
* **demo:** added inputs and outputs documentation for pois page ([36b0af4](https://github.com/webmappsrl/map-core/commit/36b0af401f222fbcc8ca0d1ac114201ebcbf82b6))
* **demo:** added more infos on custom track directive page ([c73f601](https://github.com/webmappsrl/map-core/commit/c73f601fef33a2dd00af238b2954e75ef7fdf990))
* **demo:** app routing updated ([75cbfc8](https://github.com/webmappsrl/map-core/commit/75cbfc8a5d2b1b93c05fad3ae4a956354c939dba))
* **demo:** custom draw track directive added to demo ([c2830a1](https://github.com/webmappsrl/map-core/commit/c2830a1990cf106bb21fee8d894b8eac5269918c))
* **demo:** layer directive added to demo ([ae8047e](https://github.com/webmappsrl/map-core/commit/ae8047e943f2133b4fac612b7b17d44074a9c012))
* **demo:** left bar style updated ([bef648f](https://github.com/webmappsrl/map-core/commit/bef648fee400971f563c9906e4e7f0585d044052))
* **demo:** left bar style updated ([609bbdf](https://github.com/webmappsrl/map-core/commit/609bbdfdf76b31234aae8cdd670a16e59f5df923))
* **demo:** lstyle updated ([bceaa1a](https://github.com/webmappsrl/map-core/commit/bceaa1a480b53f9acb7265760ca4a27c29ab91c9))
* **demo:** overlay directive added to demo ([f3941d9](https://github.com/webmappsrl/map-core/commit/f3941d9e63e3bc93923ee001c1709c6ba565a0ae))
* **demo:** pois directive added to demo ([0d34311](https://github.com/webmappsrl/map-core/commit/0d34311da286b507d00af047a846542753e8ac62))
* **demo:** position directive added to demo ([a2fcc28](https://github.com/webmappsrl/map-core/commit/a2fcc28fa0a898032cc46ff1237708c4165432d3))
* **demo:** refactor ([fee45b3](https://github.com/webmappsrl/map-core/commit/fee45b3d4282595ea59d3ee824b812ce42c2b4cb))
* **demo:** refactor and code cleanup ([418f6f3](https://github.com/webmappsrl/map-core/commit/418f6f3f1df4a7f40f69b4deaff3cdc0fcca729b))
* **demo:** refactor on track related pois page ([06cc1ff](https://github.com/webmappsrl/map-core/commit/06cc1ff77f616ec84f74842047ad1fdc7ec30fcf))
* **demo:** scss refactor ([fbee10f](https://github.com/webmappsrl/map-core/commit/fbee10f59c304448da66f9bd0e61d6b28015da68))
* **demo:** scss updated for custom tracks and track related pois ([064607d](https://github.com/webmappsrl/map-core/commit/064607d323d740dd26fcb6c2a084416de2ea44d4))
* **demo:** start implementing left-bar with map and track route ([144175c](https://github.com/webmappsrl/map-core/commit/144175cba9d578578e5015f40d93a6fc337e4a9b))
* **demo:** start implementing left-bar with map and track route ([44035fd](https://github.com/webmappsrl/map-core/commit/44035fd6c8c9f472129e659178225cf6c0e4bf48))
* **demo:** track directive added to demo ([1e91b86](https://github.com/webmappsrl/map-core/commit/1e91b8607376a5a77841b758cafcbad56522f210))
* **demo:** track related pois directive added to demo ([41ee431](https://github.com/webmappsrl/map-core/commit/41ee431a7f7444e01ad305818fe54e51f7aa90b7))
* **directive/geojson:** add geojson directive ([fae8d4e](https://github.com/webmappsrl/map-core/commit/fae8d4e1e60ff3dd7b4d0565206017f7a7af27e4))
* **directive/pois: filter by layer:** implements ([3fb5e3b](https://github.com/webmappsrl/map-core/commit/3fb5e3b5777ecb087655d06ed1d355b51a0acbbc))
* **directives/feature-collection:** set opacity to 0.4 ([d4c7df4](https://github.com/webmappsrl/map-core/commit/d4c7df4c20f39ee138cb93e5650af25090264cb9))
* **directives/layer_pois:** filter by inputType in searcheable property ([49bf7d5](https://github.com/webmappsrl/map-core/commit/49bf7d5eecd99dd0861e5b1fe9741c68bb33b12a))
* **filters:** implements slider filters ([b745f38](https://github.com/webmappsrl/map-core/commit/b745f38a5a96d4d0a5ae2491b78c644d740fcddb))
* **fitview_map_component:** implements ([e77d1f6](https://github.com/webmappsrl/map-core/commit/e77d1f66f4ff5a2c848e1c7d7c1f25a5c32794bc))
* **i_miei_percorsi:** implements ([7502a31](https://github.com/webmappsrl/map-core/commit/7502a3193ed94ef5c594891c7ca086385668dfc5))
* **Lettura del colore della traccia:** implements ([0782f72](https://github.com/webmappsrl/map-core/commit/0782f72b64c79e0ef58b7bf1edde78e1564d3be0))
* **loading:** dismiss loading after first rendering ([d4da6d7](https://github.com/webmappsrl/map-core/commit/d4da6d7f8c0bde9f555afc5803fd2f3dbdf361cb))
* **ol:** add createIconFeatureFromSrc() ([1256d8b](https://github.com/webmappsrl/map-core/commit/1256d8b80fbd49ef765e7ca563a8125c591179e1))
* **start_end_icons_zindex:** implements ([e75073c](https://github.com/webmappsrl/map-core/commit/e75073c73e8e7ea4eff18cf057895c08146ff27d))
* **start_end_icons_zindex:** implements ([e75073c](https://github.com/webmappsrl/map-core/commit/e75073c73e8e7ea4eff18cf057895c08146ff27d))
* **ui_ux_improvements_map:** adding next and prev color in animateFeature animation ([#13](https://github.com/webmappsrl/map-core/issues/13)) ([67fad8e](https://github.com/webmappsrl/map-core/commit/67fad8e08876dafd97932fb19156416f552fbc0e))


### Bug Fixes

* **demo:** bug fixing for track color and padding map ([9085d85](https://github.com/webmappsrl/map-core/commit/9085d85f3f8dc031ef0b92d08732fa97480bd176))
* **directive/custo-track-draw:** force track rendering ([e6e3987](https://github.com/webmappsrl/map-core/commit/e6e3987c4afbb56a18f7ceba14486d2b1bc74547))
* **directive/custom-track-draw:** switch to createIconFeatureFromSrc ([f45ecb3](https://github.com/webmappsrl/map-core/commit/f45ecb36ec9d2bdfcf2037ba776699eddd59bee1))
* **directive/feature-collection:** remove mock ([c397ec9](https://github.com/webmappsrl/map-core/commit/c397ec9d60fbc3501447e7aefb102a0562b32f77))
* **directive/pois:** remove ol-map set target ([204e513](https://github.com/webmappsrl/map-core/commit/204e513a0bef335bfa28380909e2b9e7d9307f97))
* **directive/position:** fix assets path ([7a9aab7](https://github.com/webmappsrl/map-core/commit/7a9aab71ec45a799a1605fdb1a790566d59588cb))
* **directive/track:** changes  inside isInit ([788344c](https://github.com/webmappsrl/map-core/commit/788344c933becada8d60a80344273ead7bc202d0))
* **directives/layer:** improve layer  vectorTile rendering ([c4e0980](https://github.com/webmappsrl/map-core/commit/c4e09802248c57b2d646ec5fca4c8fed8bee7028))
* **directives/pois:** fitview ([aadf77f](https://github.com/webmappsrl/map-core/commit/aadf77f3306d0149f0219805bed5bf11a8a08a4b))
* **directives/pois:** POI zoom back to default ([59fd29e](https://github.com/webmappsrl/map-core/commit/59fd29eec1ba84d0378f3347a088a7c7944d57cd))
* **directives/track.related_pois:** set right zindex ([395afd9](https://github.com/webmappsrl/map-core/commit/395afd995288ae338211d8faa84ab66d8a8b7149))
* **fitView:** add priority ([440f8c2](https://github.com/webmappsrl/map-core/commit/440f8c20fd89a30eb67ff6aeed126f6d46609940))
* **fitView:** handling fitView timing ([a81b2b3](https://github.com/webmappsrl/map-core/commit/a81b2b32b36fa9936923b8701dc434b9a2d94e52))
* **Hide popups when going back to homepage:** implements ([3362489](https://github.com/webmappsrl/map-core/commit/3362489a3d6cb0bb97189ab9b717aa22e0983dd6))
* **i_miei_percorsi_icon_bug:** fix rendering issue ([e05543f](https://github.com/webmappsrl/map-core/commit/e05543f94f145e90af5b020937171573a6f2a424))
* **i_miei_percorsi_icon_bug:** start of implementation ([e05543f](https://github.com/webmappsrl/map-core/commit/e05543f94f145e90af5b020937171573a6f2a424))
* **map:** blank page when switch from off line to online ([cbde36c](https://github.com/webmappsrl/map-core/commit/cbde36c8ff3e17e3ad757a0d1b7d3b24c298c0e3))
* **Navigate to the next or previous story:** done ([e621dfc](https://github.com/webmappsrl/map-core/commit/e621dfc410c69cfb3531985e96ed70b0a0fe7a64))
* **navigation:** correct location centering ([b3a34aa](https://github.com/webmappsrl/map-core/commit/b3a34aac57f0cd4b6095821115983297677a7c7d))
* **overlayes - parco-png:** ref 1053 ([3506640](https://github.com/webmappsrl/map-core/commit/3506640215f3e8a96444778914dd069dfffaf64a))
* **overlayes - parco-png:** ref 1054 ([6644e28](https://github.com/webmappsrl/map-core/commit/6644e284d0755eb282f6a85122ea41db34ab7170))
* **overlays - parco-pnc:** ref 1050 ([461d82d](https://github.com/webmappsrl/map-core/commit/461d82d09f0f6ffc962a765ba560ab7237f417a8))
* **pois.directive:** handling missin poi_type ([0caa80b](https://github.com/webmappsrl/map-core/commit/0caa80be9688395511154d6fa3dad557d15fefb2))
* **pois.directive:** handling missin poi_type ([5cc8b53](https://github.com/webmappsrl/map-core/commit/5cc8b539e4b3570dc13b1851069070bb681e41cd))
* **record:** follow location ([93fef48](https://github.com/webmappsrl/map-core/commit/93fef48a08619e6869ce4d441e8f98cc5304d9d8))
* **selected_track_color_is_not_changing:** zindex updated for selected tracks ([9cf2905](https://github.com/webmappsrl/map-core/commit/9cf2905239ca71d30175219879940e63b8158772))
* **src/map-core.module:** updated directives in import ([d1cd909](https://github.com/webmappsrl/map-core/commit/d1cd909acd345e48675f08593bfb29b6f2b9ba87))
* **styleCoreFn:** generalize taxonomies ([05ef9aa](https://github.com/webmappsrl/map-core/commit/05ef9aa0a0783127328bc1ea78697b29f95ddc61))
* **styles:** hide start & end icons, ref when layer si not selected ([567e024](https://github.com/webmappsrl/map-core/commit/567e024780d5d7afdb9cef322311e86075daaa4e))
* **test:** hotifx on tests after the merge ([27df72f](https://github.com/webmappsrl/map-core/commit/27df72fdd88ca8ddf4346ff6fb83902effbe3633))
* **track_related_poi_icon:** patch ([a03d487](https://github.com/webmappsrl/map-core/commit/a03d4879ff384b9fd4cb82ce7a598b57f953569d))
* **wm-controls:** wmMapControlClose ([e098f94](https://github.com/webmappsrl/map-core/commit/e098f94bcc1e63039e910583233c7569df2500d3))

#### 1.0.5 (2023-05-04)

##### Build System / Dependencies

* **package:**
  *  set right version (2b897ec2)
  *  update scripts (75b2e8f9)
* **coverage:**  add coverage (0b4f3f33)
* **tsconfig:**  un wrap tsconfig (67469c0e)

##### Tests

* **components:**  test implementation (6fa57ca5)
* **utils/ol:**
  *  test implementation (df0e4ac2)
  *  test implementation (caf287f9)

#### 1.0.4 (2022-11-08)

##### Chores

* **graphhopper:**  pass to internal server conf (dedd5003)
* **layer:**  add highlight style on hover feature (07bc71ee)
* **cache:**  add indexDB by localforage (24d94f82)
* **ol:**  update ol to 7.1.0(the last) (79a2d68c)
* **cache system:**  add local storage cache system for layers (61090fc3)

##### New Features

* **map:**  add max and min stroke width by params (6314b4bc)

##### Bug Fixes

* **pois:**  selected assets icons (6898170d)

##### Other Changes

* **naming:**  change directive names (8fde67c6)

##### Performance Improvements

* **maptile:**  remove webgl rendering (f63fa2df)
* **tileMap:**  add webgl rendering (01694933)

##### Refactors

* **layer-progress-bar:**  move layer progress bar code from layer to layer-progress-bar directive (1b3b8c74)
* **highlight track:**  move highlith code from layer to highlighttrack directives (88dbf1e8)
* **draw-track:**  add toast message when point cannot routed (09651da1)

#### 1.0.3 (2022-10-21)

##### Bug Fixes

* **pois:**  handling poi popup opening (73e8f4d0)

##### Refactors

* **fitView:**  centralize fitView function (541a0988)

#### 1.0.1 (2022-10-20)

##### Other Changes

* **build:**  add changelog generator (52187efb)

#### 1.0.1 (2022-10-20)

##### Other Changes

* **build:**  add changelog generator (52187efb)


#### 1.0.0 (2022-10-20)

##### Other Changes

* **build:**  add changelog generator (52187efb)
