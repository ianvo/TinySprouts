import { Scene } from 'phaser';

import { EventBus } from '../EventBus';
import { GameScene } from './GameScene';

export class MainMenu extends GameScene
{
    constructor ()
    {
        super('MainMenu', "Main Menu");
    }

    create ()
    {
        this.useFixedStageCamera(this.cameras.main, 512, 384, 1);
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        this.scene.start('AdditionGameScene');
    }
}
