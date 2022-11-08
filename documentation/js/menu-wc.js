'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">map-core documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                        <li class="link">
                            <a href="changelog.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>CHANGELOG
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-toggle="collapse" ${ isNormalMode ?
                                'data-target="#modules-links"' : 'data-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/WmMapModule.html" data-type="entity-link" >WmMapModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                            'data-target="#components-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' : 'data-target="#xs-components-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' :
                                            'id="xs-components-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' }>
                                            <li class="link">
                                                <a href="components/WmMapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/WmMapControls.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapControls</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/WmMapSaveCustomTrackControls.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapSaveCustomTrackControls</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                        'data-target="#directives-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' : 'data-target="#xs-directives-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' }>
                                        <span class="icon ion-md-code-working"></span>
                                        <span>Directives</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="directives-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' :
                                        'id="xs-directives-links-module-WmMapModule-56fb681e48fa628d7f1de026d82741114689e5962c9101ed14423a1dca88fd7c07a5c775443e412b5d2f4b369d230882e5b8ecb96b8496a73df373a2fe2b384e"' }>
                                        <li class="link">
                                            <a href="directives/WmMapCustomTracksDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapCustomTracksDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/WmMapLayerDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapLayerDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/WmMapLayerProgressBarDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapLayerProgressBarDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/WmMapPoisDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapPoisDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/WmMapTrackDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WmMapTrackDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/wmMapCustomTrackDrawTrackDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >wmMapCustomTrackDrawTrackDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/wmMapTrackHighLightDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >wmMapTrackHighLightDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/wmMapTrackRelatedPoisDirective.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >wmMapTrackRelatedPoisDirective</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#directives-links"' :
                                'data-target="#xs-directives-links"' }>
                                <span class="icon ion-md-code-working"></span>
                                <span>Directives</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="directives-links"' : 'id="xs-directives-links"' }>
                                <li class="link">
                                    <a href="directives/WmMapBaseDirective.html" data-type="entity-link" >WmMapBaseDirective</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#interfaces-links"' :
                            'data-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/handlingStrokeStyleWidthOptions.html" data-type="entity-link" >handlingStrokeStyleWidthOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/performance.html" data-type="entity-link" >performance</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#miscellaneous-links"'
                            : 'data-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});