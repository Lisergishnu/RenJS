import RJSScreenEffectInterface from './RJSScreenEffect';
import {TweenManagerInterface} from '../managers/TweenManager';
import {Group} from 'phaser';
import RJS from '../core/RJS';


export default class Transition implements RJSScreenEffectInterface {

    static CUT = 'CUT'
    static FADE = 'FADE'
    static FADEOUT = 'FADEOUT'
    static FADEIN = 'FADEIN'
    static FUSION = 'FUSION'
    static MOVE = 'MOVE'
    static FADETOCOLOUR = 'FADETOCOLOUR'


    private game: RJS
    private tweenManager: TweenManagerInterface

    constructor(game: RJS) {
        this.game = game
        this.tweenManager = game.managers.tween
    }

    get(name: string): any{
        return (from, to, position, scaleX?) => {
            if (this[name]){
                this[name](from, to, position, scaleX)
            } else {
                this.game.pluginsRJS[name].execute(from, to, position, scaleX)
            }
        }
    }

    async CUT(from, to, position, scaleX?): Promise<void> {
        if (from) {
            from.alpha = 0;
        }
        if (to) {
            to.alpha = 1;
            setNewProperties(to, position, scaleX);
        }
    }

    async FADE(from, to, position, scaleX?): Promise<any> {
        if (!from) return this.FADEIN(to, position, scaleX);
        if (!to) return this.FADEOUT(from);

        return new Promise(resolve => {
            this.tweenManager.chain([
                {
                    sprite: from, tweenables: {alpha: 0}, callback: () => {
                        setNewProperties(to, position, scaleX);
                        resolve();
                    }
                },
                {sprite: to, tweenables: {alpha: 1}}
            ], this.game.defaultValues.fadetime);
        })

    }

    async FADEOUT(from): Promise<void> {
        return new Promise(resolve => {
            this.tweenManager.tween(from, {alpha: 0}, resolve, this.game.defaultValues.fadetime, true);
        })
    }

    async FADEIN(to, position, scaleX): Promise<void> {
        return new Promise(resolve => {
            setNewProperties(to, position, scaleX);
            this.tweenManager.tween(to, {alpha: 1}, resolve, this.game.defaultValues.fadetime, true);
        })
    }

    async FUSION(from, to, position, scaleX, group: Group): Promise<void> {
        if (!from || !to) {
            return this.FADE(from, to, position);
        }
        return new Promise(resolve => {
            if (group) {
                group.bringToTop(to);
            }
            setNewProperties(to, position, scaleX);

            this.tweenManager.tween(to, {alpha: 1}, () => {
                from.alpha = 0;
                resolve();
            }, this.game.defaultValues.fadetime, true);
        });
    }

    async MOVE(from, to, position, scaleX): Promise<void> {
        if (!from || !to) {
            return this.CUT(from, to, position);
        }
        return new Promise(resolve => {
            this.tweenManager.tween(from, {x: position.x, y: position.y}, () => {
                setNewProperties(to, position, scaleX);
                from.alpha = 0;
                to.alpha = 1;
                resolve();
            }, this.game.defaultValues.fadetime, true);
        });
    }

    async FADETOCOLOUR(from, to, position, scaleX, colour): Promise<void> {
        const sprBg = this.game.add.graphics(0, 0);
        // this.fadeColor = fadeColor ? fadeColor : 0x000000;
        sprBg.beginFill(colour, 1);
        sprBg.drawRect(0, 0, this.game.config.w, this.game.config.h);
        sprBg.alpha = 0;
        sprBg.endFill();
        return new Promise(resolve => {
            this.tweenManager.chain([
                {
                    sprite: sprBg, tweenables: {alpha: 1}, callback: (): void => {
                        if (from) {
                            from.alpha = 0;
                        }
                        if (to) {
                            setNewProperties(to, position, scaleX);
                            to.alpha = 1;
                        }
                    }
                },
                {
                    sprite: sprBg, tweenables: {alpha: 0}, callback: () => {
                        sprBg.destroy();
                        resolve();
                    }
                }
            ], this.game.defaultValues.fadetime);
        });
    }

    async FADETOBLACK (from, to, position): Promise<void> {
        return this.FADETOCOLOUR(from,to,position, null,0x000000)
    }

    async FADETOWHITE (from, to, position): Promise<void> {
        return this.FADETOCOLOUR(from, to, position, null, 0xFFFFFF)
    }
}

const setNewProperties = (sprite, position, scaleX): void => {
    sprite.x = position.x;
    sprite.y = position.y;
    if (scaleX !== null && scaleX !== undefined) {
        sprite.scale.x = scaleX;
    }
}
