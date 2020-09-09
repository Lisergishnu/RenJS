import {Tween} from 'phaser';
import RJS from '../core/RJS';
import RJSTween from '../core/RJSTween';
import RJSManagerInterface from './RJSManager';

export interface TweenManagerInterface extends RJSManagerInterface {
    tween (sprite, tweenables, callback, time: number, start: boolean, delay?: number);
    chain (tweens: any[], time?: number);
    skip(): any;
    unskippable: boolean;
    current: RJSTween[];


}

export default class TweenManager implements TweenManagerInterface {
    unskippable: boolean
    current = []
    private game: RJS


    constructor(game: RJS) {
        this.game = game
    }

    tween(sprite, tweenables, callback, time, start, delay?): RJSTween {
        const tween: RJSTween = this.game.add.tween(sprite);
        delay = !delay ? 0 : delay;
        tween.to(tweenables, time, Phaser.Easing.Linear.None,false, delay);
        if (callback) {
            tween.onComplete.addOnce(callback, this);
            tween.callbackOnComplete = callback;
        }
        tween.tweenables = tweenables;
        if (start){
            this.current = [];
            tween.start();
            if (!this.game.control.auto) {
                this.game.waitForClick(() => this.skip());
            }
        }
        this.current.push(tween);
        // if (RenJS.control.skipping){
        //     this.skip();
        // }
        return tween;

    }

    chain(tweens, time): void {
        this.current = [];
        let lastTween = null;
        tweens.forEach(tw => {
            const t = tw.time ? tw.time : time/tweens.length;
            const tween = this.tween(tw.sprite, tw.tweenables, tw.callback, t, false, tw.delay);
            if (lastTween){
                lastTween.chain(tween);
            }
            lastTween = tween;
        });
        this.current[0].start();
        if (!this.game.control.auto) {
            this.game.waitForClick(() => this.skip());
        }
    }

    parallel (tweens, time): void {
        this.current = [];
        tweens.forEach(tw => {
            const tween = this.tween(tw.sprite,tw.tweenables,tw.callback,time,false,tw.delay);
            tween.start();
        });
        if (!this.game.control.auto) {
            this.game.waitForClick(() => this.skip());
        }
    }

    skip(): void {
        if (this.unskippable){
            return;
        }
        this.current.forEach(tween => {
            tween.stop(false);
            for (const property in tween.tweenables){
                tween.target[property] = tween.tweenables[property];
            }
            if (tween.callbackOnComplete){
                tween.callbackOnComplete();
            }
        });
        this.current = [];
    }

    set(...args: any): void {
        //
    }
}
