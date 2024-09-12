import { Scene } from 'phaser';
import {Howl} from 'howler';


export class GameScene extends Scene {
    title: string;
    bgm: Map<string, Howl>;
    sfx: Map<string, Howl>;

    constructor (key: string, title: string) {
        super(key);
        this.title = title;
        this.bgm = new Map<string, Howl>();
        this.sfx = new Map<string, Howl>();
    }

    startScene (key: string) {
        this.bgm.forEach((value: Howl, key: string) => {
            value.stop();
        });
        this.sfx.forEach((value: Howl, key: string) => {
            value.stop();
        });
        this.scene.start(key);
    }
}
