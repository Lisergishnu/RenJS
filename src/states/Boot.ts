// import Phaser from 'phaser';
import {preparePath} from './utils';
import RJSState from './RJSState';

import Preload from './Preload';

class Boot extends RJSState {

    constructor() {
        super({key: 'bootstrap'});
    }

    init(): void {
        if (this.game.config.i18n){
            return;
        }
        // @todo handle this
        // if (!(this.game.config.scaleMode === Phaser.ScaleModes.   /* Phaser.ScaleManager.EXACT_FIT */)){
        //     this.game.scale.pageAlignHorizontally = true;
        //     this.game.scale.pageAlignVertically = true;
        // }
        // this.game.scale.scaleMode = Phaser.ScaleManager[this.game.config.scaleMode];
        this.game.scale.refresh();
    }

    preload(): void {
        this.load.image('splash',  preparePath(this.game.config.splash.loadingScreen, this.game));
        if (this.game.config.splash.loadingBar) {
            if (this.game.config.splash.loadingBar.fullBar){
                this.load.image('loading',  preparePath(this.game.config.splash.loadingBar.fullBar, this.game));
            }
            if (this.game.config.splash.loadingBar.asset){
                const w = this.game.config.splash.loadingBar.size.w;
                const h = this.game.config.splash.loadingBar.size.h;
                this.load.spritesheet('loading',  preparePath(this.game.config.splash.loadingBar.asset, this.game),w,h);
            }
        }
    }

    create (): void {
        this.game.scene.add('preload', Preload);
        this.game.scene.start('preload');
    }
}



export default Boot
