import {ActionSheetController, ModalController, NavController} from '@ionic/angular';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
} from '@angular/core';

import {DEF_MAP_LOCATION_ZOOM} from 'src/app/constants/map';
import {ESuccessType} from 'src/app/types/esuccess.enum';
import {GeolocationService} from 'src/app/services/geolocation.service';
import {ILocation} from 'src/app/types/location';
import {ModalSuccessComponent} from 'src/app/components/modal-success/modal-success.component';
import {ModalphotosaveComponent} from 'src/app/components/modalphotos/modalphotosave/modalphotosave.component';
import {PhotoService} from 'src/app/services/photo.service';
import {SaveService} from 'src/app/services/save.service';
import {TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'wm-btn-track-recording',
  templateUrl: './btn-track-recording.component.html',
  styleUrls: ['./btn-track-recording.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BtnTrackRecordingComponent {
  @Output('start-recording') startRecording: EventEmitter<string> = new EventEmitter<string>();

  constructor(
    private _actionSheetCtrl: ActionSheetController,
    private _translateSvc: TranslateService,
    private _navCtrl: NavController,
    private _geolocationSvc: GeolocationService,
    private _modalController: ModalController,
    private _photoService: PhotoService,
    private _saveService: SaveService,
  ) {}

  openActionSheet() {
    this._actionSheetCtrl
      .create({
        header: this._translateSvc.instant('components.map.register.title'),
        buttons: [
          {
            text: this._translateSvc.instant('components.map.register.track'),
            handler: () => {
              this._track();
            },
          },
          {
            text: this._translateSvc.instant('components.map.register.photo'),
            handler: () => {
              this.photo();
            },
          },
          {
            text: this._translateSvc.instant('components.map.register.waypoint'),
            handler: () => {
              this.waypoint();
            },
          },
          {
            text: this._translateSvc.instant('components.map.register.vocal'),
            handler: () => {
              this.vocal();
            },
          },
          {
            text: this._translateSvc.instant('components.map.register.cancel'),
            role: 'cancel',
            handler: () => {},
          },
        ],
      })
      .then(actionSheet => {
        actionSheet.present();
      });
  }

  async openModalSuccess(photos) {
    const modaSuccess = await this._modalController.create({
      component: ModalSuccessComponent,
      componentProps: {
        type: ESuccessType.PHOTOS,
        photos,
      },
    });
    await modaSuccess.present();
    await modaSuccess.onDidDismiss();
  }

  async photo() {
    let photoCollection = await this._photoService.addPhotos();

    const modal = await this._modalController.create({
      component: ModalphotosaveComponent,
      componentProps: {
        photos: photoCollection,
      },
    });
    await modal.present();
    const res = await modal.onDidDismiss();

    if (!res.data.dismissed) {
      await this._saveService.savePhotos(res.data.photos);

      await this.openModalSuccess(res.data.photos);
    }

    // Can be set to the src of an image now
    // imageElement.src = imageUrl;
  }

  vocal(): void {}

  waypoint() {
    this._navCtrl.navigateForward('waypoint');
  }

  private _track(): void {
    const location: ILocation = this._geolocationSvc.location;
    let state: any = {};

    if (location && location.latitude && location.longitude) {
      state = {
        startView: [location.longitude, location.latitude, DEF_MAP_LOCATION_ZOOM],
      };
    }

    this._navCtrl.navigateForward('register');
  }
}
