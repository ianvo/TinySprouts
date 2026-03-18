import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import { Howl } from 'howler';

type ChickenMarker = {
    sprite: Phaser.GameObjects.Sprite;
    badge: Phaser.GameObjects.Text;
};

export class CountingGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.Image;
    promptText!: Phaser.GameObjects.Text;
    helperText!: Phaser.GameObjects.Text;
    countText!: Phaser.GameObjects.Text;
    frameBase!: Phaser.GameObjects.Rectangle;
    frameSlots: Phaser.GameObjects.Rectangle[];
    chickens: ChickenMarker[];
    solution: number;
    answerButtons: Phaser.GameObjects.Container[];
    tappedChickens: Set<number>;

    constructor ()
    {
        super('CountingGameScene', 'Counting Coop');
        this.frameSlots = [];
        this.chickens = [];
        this.solution = 0;
        this.answerButtons = [];
        this.tappedChickens = new Set<number>();
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.useFixedStageCamera(this.camera);
        this.camera.setBackgroundColor('rgba(0,0,0,0)');
        this.bgm.set('gameplay', new Howl({
            src: ['assets/bgm/High End Party.ogg'],
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
            src: ['assets/sfx/GAME_MENU_SCORE_SFX000603.ogg'],
            autoplay: false,
            loop: false,
            volume: 0.5
        }));

        this.promptText = this.addGameText(0, -290, 'How many chickens do you see?', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 50,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.helperText = this.addGameText(0, -240, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#fff5dc',
            stroke: '#304225',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: 820 }
        }).setOrigin(0.5).setDepth(100);

        this.countText = this.addGameText(0, 92, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 38,
            color: '#fff5dc',
            stroke: '#304225',
            strokeThickness: 7,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.frameBase = this.add.rectangle(0, -26, 560, 250, 0xffefc6)
            .setStrokeStyle(8, 0x8c5728)
            .setDepth(5);

        this.helperText.setVisible(false);

        this.buildAnswerButtons();
        this.generateProblem();
        this.watchDifficultyChanges(() => {
            this.buildAnswerButtons();
            this.generateProblem();
        });
        EventBus.emit('current-scene-ready', this);
    }

    buildAnswerButtons () {
        this.answerButtons.forEach((button) => button.destroy());
        this.answerButtons = [];

        const maxValue = this.getMaxAnswerValue();
        const columns = maxValue <= 5 ? 5 : 5;
        const spacing = 132;
        const startX = -((columns - 1) * spacing) / 2;
        const startY = GameScene.ANSWER_GRID_Y;
        const rowSpacing = GameScene.ANSWER_ROW_SPACING;

        for (let index = 0; index < maxValue; index++) {
            const value = index + 1;
            const x = startX + (index % columns) * spacing;
            const y = startY + Math.floor(index / columns) * rowSpacing;
            this.addButton(value, x, y);
        }
    }

    getMaxAnswerValue () {
        const difficultyLevel = this.getDifficultyLevel();
        return difficultyLevel === 1 ? 5 : 10;
    }

    addButton (value: number, x: number, y: number) {
        const button = this.add.container(x, y);
        const sprite = this.add.sprite(0, 0, 'button');
        sprite.setScale(1.85);
        sprite.setOrigin(0.5, 0.5);
        sprite.setInteractive({ cursor: 'pointer' });
        const text = this.addGameText(0, 0, `${value}`, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 38,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5, 0.5);
        text.disableInteractive();
        button.add([sprite, text]);

        sprite.on('pointerup', () => {
            this.submitAnswer(value);
        });

        sprite.on('pointerover', () => {
            button.setScale(1.06);
        });

        sprite.on('pointerout', () => {
            button.setScale(1);
        });

        this.answerButtons.push(button);
    }

    submitAnswer (proposedAnswer: number) {
        if (proposedAnswer === this.solution) {
            this.sfx.get('correct')?.play();
            this.countText.setText('That\'s right!');
            this.time.delayedCall(900, () => {
                this.generateProblem();
            });
            return;
        }

        this.sfx.get('incorrect')?.play();
        this.countText.setText('Try again.');
        this.cameras.main.shake(200, 0.002);
    }

    generateProblem () {
        this.clearChickens();
        this.tappedChickens.clear();

        const difficultyLevel = this.getDifficultyLevel();
        const maxCount = difficultyLevel === 1 ? 5 : 10;
        let newSolution = this.solution;
        while (newSolution === this.solution) {
            newSolution = Phaser.Math.Between(1, maxCount);
        }
        this.solution = newSolution;

        this.countText.setText('');
        this.updateFrameLayout();
        this.createChickenLayout();
    }

    createChickenLayout () {
        const positions = this.getChickenPositions();
        positions.slice(0, this.solution).forEach((position, index) => {
            const sprite = this.add.sprite(position.x, position.y, 'chicken')
                .setScale(position.scale)
                .setDepth(20)
                .setInteractive({ cursor: 'pointer' });
            const badge = this.addGameText(position.x, position.y - 44, '', {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 24,
                color: '#fff7df',
                stroke: '#284126',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(30);

            sprite.on('pointerup', () => {
                this.markChicken(index);
            });

            this.chickens.push({ sprite, badge });
        });
    }

    updateFrameLayout () {
        const slotCount = this.getMaxAnswerValue();
        const useFrame = this.getDifficultyLevel() < 3;
        const isFiveFrame = slotCount === 5;
        const baseY = isFiveFrame ? -46 : -26;
        const baseHeight = isFiveFrame ? 132 : 250;
        const slotWidth = 90;
        const slotHeight = 88;
        const gap = 12;
        const startX = -2 * (slotWidth + gap);
        const startY = isFiveFrame ? -46 : -80;

        this.frameSlots.forEach((slot) => slot.destroy());
        this.frameSlots = [];

        this.frameBase.setVisible(useFrame);
        if (!useFrame) {
            return;
        }

        this.frameBase
            .setPosition(0, baseY)
            .setSize(560, baseHeight)
            .setDisplaySize(560, baseHeight);

        for (let index = 0; index < slotCount; index++) {
            const column = index % 5;
            const row = Math.floor(index / 5);
            const x = startX + column * (slotWidth + gap);
            const y = startY + row * 108;
            const slot = this.add.rectangle(x, y, slotWidth, slotHeight, 0xfffaee)
                .setStrokeStyle(4, 0xa97d3f)
                .setDepth(8);
            this.frameSlots.push(slot);
        }
    }

    getChickenPositions () {
        if (this.getDifficultyLevel() < 3) {
            return this.frameSlots.map((slot) => ({
                x: slot.x,
                y: slot.y + 4,
                scale: this.getDifficultyLevel() === 1 ? 0.54 : 0.46
            }));
        }

        return [
            { x: -275, y: -90, scale: 0.68 },
            { x: -170, y: -120, scale: 0.62 },
            { x: -28, y: -46, scale: 0.76 },
            { x: 92, y: -118, scale: 0.62 },
            { x: 260, y: -84, scale: 0.7 },
            { x: -244, y: 64, scale: 0.72 },
            { x: -78, y: 92, scale: 0.64 },
            { x: 76, y: 38, scale: 0.78 },
            { x: 224, y: 106, scale: 0.66 },
            { x: 8, y: 158, scale: 0.7 }
        ];
    }

    markChicken (index: number) {
        if (this.tappedChickens.has(index)) {
            return;
        }

        const chicken = this.chickens[index];
        if (!chicken) {
            return;
        }

        this.tappedChickens.add(index);
        const count = this.tappedChickens.size;
        chicken.badge.setText(`${count}`);
        chicken.sprite.setTint(0xfff1a8);
        this.tweens.add({
            targets: chicken.sprite,
            scaleX: chicken.sprite.scaleX * 1.08,
            scaleY: chicken.sprite.scaleY * 1.08,
            duration: 120,
            yoyo: true
        });

        if (count === this.solution) {
            this.countText.setText('Counted them all.');
        }
        else {
            this.countText.setText(`${count}`);
        }
    }

    clearChickens () {
        this.chickens.forEach(({ sprite, badge }) => {
            sprite.destroy();
            badge.destroy();
        });
        this.chickens = [];
    }

    update () {}

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
