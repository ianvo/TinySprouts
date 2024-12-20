import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { AdditionGameScene } from './scenes/minigames/AdditionGameScene';
import { CountingGameScene } from './scenes/minigames/CountingGameScene';
import { PatternGameScene } from './scenes/minigames/PatternGameScene';
import { MemoryGameScene } from './scenes/minigames/MemoryGameScene';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 768
    },
    roundPixels: true,
    pixelArt: false,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scene: [
        Boot,
        Preloader,
        MainMenu,
        AdditionGameScene,
        CountingGameScene,
        PatternGameScene,
        MemoryGameScene
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
