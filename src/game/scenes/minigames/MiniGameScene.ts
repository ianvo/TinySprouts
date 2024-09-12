import { Scene } from 'phaser';


export class MiniGameScene extends Scene
{
    title: string;

    constructor (key: string, title: string)
    {
        super(key);
        this.title = title;
    }

}
