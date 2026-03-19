import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import { Howl } from 'howler';

type TileRepresentation = 'number' | 'eggs';

type MatchTile = {
    value: number;
    representation: TileRepresentation;
    container: Phaser.GameObjects.Container;
    front: Phaser.GameObjects.Container;
    back: Phaser.GameObjects.Rectangle;
    backLabel: Phaser.GameObjects.Text;
    matched: boolean;
    revealed: boolean;
};

export class MemoryGameScene extends GameScene
{
    static readonly FEEDBACK_Y = -196;
    camera!: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.Image;
    promptText!: Phaser.GameObjects.Text;
    helperText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    tiles: MatchTile[];
    selectedTiles: MatchTile[];
    inputLocked: boolean;

    constructor ()
    {
        super('MemoryGameScene', 'Memory Match');
        this.tiles = [];
        this.selectedTiles = [];
        this.inputLocked = false;
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.useFixedStageCamera(this.camera);
        this.camera.setBackgroundColor('rgba(0,0,0,0)');
        this.bgm.set('gameplay', new Howl({
            src: ['assets/bgm/Theme_1_NewDayEnergy_Loop.ogg'],
            autoplay: true,
            loop: true,
            volume: 0.3
        }));
        this.bgm.set('victory', new Howl({
            src: ['assets/bgm/LOOP_Feel-Good-Victory.ogg'],
            autoplay: false,
            loop: true,
            volume: 0.5
        }));
        this.sfx.set('correct', new Howl({
            src: ['assets/sfx/correct.ogg'],
            autoplay: false,
            loop: false,
            volume: 0.5
        }));
        this.sfx.set('incorrect', new Howl({
            src: ['assets/sfx/incorrect.ogg'],
            autoplay: false,
            loop: false,
            volume: 0.5
        }));

        this.promptText = this.addGameText(0, -292, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.helperText = this.addGameText(0, -244, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#fff7df',
            stroke: '#2d3d24',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.feedbackText = this.addGameText(0, MemoryGameScene.FEEDBACK_Y, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 36,
            color: '#fff7df',
            stroke: '#2d3d24',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.helperText.setVisible(false);

        this.generateBoard();
        this.watchDifficultyChanges(() => {
            this.generateBoard();
        });
        EventBus.emit('current-scene-ready', this);
    }

    generateBoard () {
        this.clearTiles();
        this.selectedTiles = [];
        this.inputLocked = false;
        this.feedbackText.setText('');

        const difficultyLevel = this.getDifficultyLevel();
        if (difficultyLevel === 1) {
            this.promptText.setText('Match each number to the same eggs.');
            this.generateMemoryBoard(difficultyLevel);
            return;
        }

        this.promptText.setText('Find pairs that add up to 10.');
        this.generateMemoryBoard(difficultyLevel);
    }

    generateMemoryBoard (difficultyLevel: number) {
        if (difficultyLevel === 1) {
            const tileDefs: Array<{ value: number; representation: TileRepresentation }> = [];
            [1, 2, 3, 4].forEach((value) => {
                tileDefs.push({ value, representation: 'number' });
                tileDefs.push({ value, representation: 'eggs' });
            });

            Phaser.Utils.Array.Shuffle(tileDefs);

            const columns = 4;
            const horizontalSpacing = 170;
            const verticalSpacing = 212;
            const startX = -((columns - 1) * horizontalSpacing) / 2;
            const startY = -60;

            tileDefs.forEach((tileDef, index) => {
                const tile = this.createTile(
                    startX + (index % columns) * horizontalSpacing,
                    startY + Math.floor(index / columns) * verticalSpacing,
                    tileDef.value,
                    tileDef.representation,
                    false
                );
                this.tiles.push(tile);
            });

            return;
        }

        const pairs = difficultyLevel === 2
            ? [[2, 8], [3, 7], [4, 6], [5, 5]]
            : [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5], [2, 8]];

        const tileDefs: Array<{ value: number; representation: TileRepresentation }> = [];
        pairs.forEach(([left, right], index) => {
            tileDefs.push({
                value: left,
                representation: difficultyLevel === 3 && index % 2 === 0 ? 'eggs' : 'number'
            });
            tileDefs.push({
                value: right,
                representation: difficultyLevel === 3 && index % 2 === 1 ? 'eggs' : 'number'
            });
        });

        Phaser.Utils.Array.Shuffle(tileDefs);

        const columns = tileDefs.length <= 8 ? 4 : 4;
        const horizontalSpacing = 170;
        const verticalSpacing = 212;
        const startX = -((columns - 1) * horizontalSpacing) / 2;
        const startY = tileDefs.length <= 8 ? -60 : -160;

        tileDefs.forEach((tileDef, index) => {
            const tile = this.createTile(
                startX + (index % columns) * horizontalSpacing,
                startY + Math.floor(index / columns) * verticalSpacing,
                tileDef.value,
                tileDef.representation,
                false
            );
            this.tiles.push(tile);
        });
    }

    createTile (x: number, y: number, value: number, representation: TileRepresentation, revealed: boolean) {
        const container = this.add.container(x, y).setDepth(20);

        const front = this.add.container(0, 0);
        const cardFront = this.add.rectangle(0, 0, 140, 188, 0xfff8e4)
            .setStrokeStyle(6, 0x966131)
            .setInteractive({ cursor: 'pointer' });
        front.add(cardFront);

        if (representation === 'number') {
            const numberText = this.addGameText(0, -8, `${value}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 54,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 8
            }).setOrigin(0.5);
            const caption = this.addGameText(0, 54, 'number', {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 20,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6
            }).setOrigin(0.5);
            front.add([numberText, caption]);
        }
        else {
            const columns = Math.min(5, Math.max(1, value));
            const rows = Math.ceil(value / columns);
            const horizontalGap = 22;
            const verticalGap = 26;
            const startX = -((columns - 1) * horizontalGap) / 2;
            const startY = -8 - ((rows - 1) * verticalGap) / 2;

            for (let index = 0; index < value; index++) {
                const egg = this.add.ellipse(
                    startX + (index % columns) * horizontalGap,
                    startY + Math.floor(index / columns) * verticalGap,
                    18,
                    24,
                    GameScene.EGG_FILL
                ).setStrokeStyle(3, 0x9d7846);
                front.add(egg);
            }
        }

        const back = this.add.rectangle(0, 0, 140, 188, 0x7cc5f3)
            .setStrokeStyle(6, 0x2d82b7)
            .setInteractive({ cursor: 'pointer' });
        const backText = this.addGameText(0, 0, '?', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 58,
            color: '#ffffff',
            stroke: '#23648d',
            strokeThickness: 8
        }).setOrigin(0.5);

        container.add([front, back, backText]);

        const tile: MatchTile = {
            value,
            representation,
            container,
            front,
            back,
            backLabel: backText,
            matched: false,
            revealed
        };
        this.setTileFace(tile, revealed);

        [cardFront, back].forEach((interactiveFace) => {
            interactiveFace.on('pointerup', () => {
                this.selectTile(tile);
            });

            interactiveFace.on('pointerover', () => {
                if (!this.inputLocked && !tile.matched) {
                    container.setScale(1.03);
                }
            });

            interactiveFace.on('pointerout', () => {
                container.setScale(1);
            });
        });

        return tile;
    }

    selectTile (tile: MatchTile) {
        if (this.inputLocked || tile.matched) {
            return;
        }

        const difficultyLevel = this.getDifficultyLevel();
        if (difficultyLevel > 1 && tile.revealed) {
            return;
        }

        if (!tile.revealed) {
            this.setTileFace(tile, true);
        }

        if (this.selectedTiles.includes(tile)) {
            return;
        }

        this.selectedTiles.push(tile);

        if (this.selectedTiles.length < 2) {
            return;
        }

        const [first, second] = this.selectedTiles;
        if (this.isMatchingPair(first, second)) {
            first.matched = true;
            second.matched = true;
            this.sfx.get('correct')?.play();
            this.feedbackText.setText(difficultyLevel === 1 ? 'That matches.' : 'That makes 10.');
            this.tweens.add({
                targets: [first.container, second.container],
                alpha: 0.4,
                duration: 180,
                yoyo: true,
                repeat: 1
            });
            this.selectedTiles = [];

            if (this.tiles.every((entry) => entry.matched)) {
                this.time.delayedCall(650, () => {
                    this.generateBoard();
                });
                return;
            }

            this.time.delayedCall(500, () => {
                this.feedbackText.setText('');
            });
            return;
        }

        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.inputLocked = true;
        this.time.delayedCall(550, () => {
            this.setTileFace(first, false);
            this.setTileFace(second, false);
            this.selectedTiles = [];
            this.inputLocked = false;
            this.feedbackText.setText('');
        });
    }

    isMatchingPair (first: MatchTile, second: MatchTile) {
        if (this.getDifficultyLevel() === 1) {
            return first.value === second.value && first.representation !== second.representation;
        }

        return first.value + second.value === 10;
    }

    setTileFace (tile: MatchTile, revealed: boolean) {
        tile.revealed = revealed;
        tile.front.setVisible(revealed);
        tile.back.setVisible(!revealed);
        tile.backLabel.setVisible(!revealed);
    }

    clearTiles () {
        this.tiles.forEach((tile) => tile.container.destroy());
        this.tiles = [];
    }

    update () {}

    changeScene () {}
}
