import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { AdditionGameScene } from './scenes/minigames/AdditionGameScene';
import { CountingGameScene } from './scenes/minigames/CountingGameScene';
import { PatternGameScene } from './scenes/minigames/PatternGameScene';
import { MemoryGameScene } from './scenes/minigames/MemoryGameScene';
import { SubtractionGameScene } from './scenes/minigames/SubtractionGameScene';
import { MakeTenGameScene } from './scenes/minigames/MakeTenGameScene';
import { CompareCoopsGameScene } from './scenes/minigames/CompareCoopsGameScene';
import { ChickenNumberLineGameScene } from './scenes/minigames/ChickenNumberLineGameScene';
import { BuildCartonGameScene } from './scenes/minigames/BuildCartonGameScene';
import { MissingEggBasketGameScene } from './scenes/minigames/MissingEggBasketGameScene';
import { WaysToMakeGameScene } from './scenes/minigames/WaysToMakeGameScene';
import { ShapeMatchGameScene } from './scenes/minigames/ShapeMatchGameScene';
import { CompareLengthGameScene } from './scenes/minigames/CompareLengthGameScene';
import { SortRuleGameScene } from './scenes/minigames/SortRuleGameScene';
import { BuildShapeGameScene } from './scenes/minigames/BuildShapeGameScene';
import { OrderByLengthGameScene } from './scenes/minigames/OrderByLengthGameScene';
import { PictureGraphGameScene } from './scenes/minigames/PictureGraphGameScene';
import { BalanceEquationGameScene } from './scenes/minigames/BalanceEquationGameScene';
import { AdvancedBalanceEquationGameScene } from './scenes/minigames/AdvancedBalanceEquationGameScene';

export const GAME_VERSION = Date.now();

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    transparent: true,
    
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 768
    },
    roundPixels: true,
    pixelArt: false,
    parent: 'game-container',
    scene: [
        Boot,
        Preloader,
        MainMenu,
        AdditionGameScene,
        SubtractionGameScene,
        CountingGameScene,
        CompareCoopsGameScene,
        MakeTenGameScene,
        MissingEggBasketGameScene,
        ChickenNumberLineGameScene,
        BuildCartonGameScene,
        WaysToMakeGameScene,
        BalanceEquationGameScene,
        AdvancedBalanceEquationGameScene,
        ShapeMatchGameScene,
        BuildShapeGameScene,
        CompareLengthGameScene,
        OrderByLengthGameScene,
        SortRuleGameScene,
        PictureGraphGameScene,
        PatternGameScene,
        MemoryGameScene
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
