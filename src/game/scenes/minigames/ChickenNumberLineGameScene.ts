import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type PromptMode = 'direct' | 'after' | 'before' | 'between';

type NumberDot = {
    value: number;
    x: number;
    dot: Phaser.GameObjects.Ellipse;
};

export class ChickenNumberLineGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    chicken!: Phaser.GameObjects.Sprite;
    lineObjects: Phaser.GameObjects.GameObject[];
    dots: NumberDot[];
    maxValue: number;
    targetValue: number;
    inputLocked: boolean;

    constructor ()
    {
        super('ChickenNumberLineGameScene', 'Number Line');
        this.lineObjects = [];
        this.dots = [];
        this.maxValue = 10;
        this.targetValue = 0;
        this.inputLocked = false;
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.useFixedStageCamera(this.camera);
        this.camera.setBackgroundColor('rgba(0,0,0,0)');

        this.bgm.set('gameplay', new Howl({
            src: ['assets/bgm/Song_Exploration_02_Loop.ogg'],
            autoplay: true,
            loop: true,
            volume: 0.3
        }));
        this.sfx.set('correct', new Howl({
            src: ['assets/sfx/Jingle_CorrectAnswer.ogg'],
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

        this.promptText = this.addGameText(0, -280, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 52,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.feedbackText = this.addGameText(0, -200, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#fff7df',
            stroke: '#2d3d24',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.chicken = this.add.sprite(0, -48, 'chicken')
            .setScale(0.48)
            .setDepth(40);

        this.generateRound();
        this.watchDifficultyChanges(() => {
            this.generateRound();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearLine();
        });
        EventBus.emit('current-scene-ready', this);
    }

    generateRound ()
    {
        this.inputLocked = false;
        this.feedbackText.setText('');

        const difficultyLevel = this.getDifficultyLevel();
        this.maxValue = difficultyLevel === 1 ? 10 : difficultyLevel === 2 ? 15 : 20;

        const mode = this.pickMode(difficultyLevel);
        this.targetValue = 0;

        if (mode === 'direct') {
            this.targetValue = Phaser.Math.Between(0, this.maxValue);
            this.promptText.setText(`Tap ${this.targetValue}.`);
        }
        else if (mode === 'after') {
            const base = Phaser.Math.Between(0, this.maxValue - 1);
            this.targetValue = base + 1;
            this.promptText.setText(`Tap the number after ${base}.`);
        }
        else if (mode === 'before') {
            const base = Phaser.Math.Between(1, this.maxValue);
            this.targetValue = base - 1;
            this.promptText.setText(`Tap the number before ${base}.`);
        }
        else {
            this.targetValue = Phaser.Math.Between(1, this.maxValue - 1);
            this.promptText.setText(`Tap the number between ${this.targetValue - 1} and ${this.targetValue + 1}.`);
        }

        this.renderLine();
    }

    pickMode (difficultyLevel: number): PromptMode
    {
        if (difficultyLevel === 1) {
            return 'direct';
        }

        if (difficultyLevel === 2) {
            return Phaser.Utils.Array.GetRandom<PromptMode>(['direct', 'after', 'before']);
        }

        return Phaser.Utils.Array.GetRandom<PromptMode>(['direct', 'after', 'before', 'between']);
    }

    renderLine ()
    {
        this.clearLine();
        const y = 18;
        const startX = -390;
        const endX = 390;
        const line = this.add.rectangle(0, y, endX - startX + 6, 8, 0x8f5f2e).setDepth(8);
        this.lineObjects.push(line);
        this.dots = [];

        for (let value = 0; value <= this.maxValue; value++) {
            const x = Phaser.Math.Linear(startX, endX, value / this.maxValue);
            const tick = this.add.rectangle(x, y, 4, 28, 0x8f5f2e).setDepth(10);
            const dot = this.add.ellipse(x, y, 30, 30, 0xfff7e3)
                .setStrokeStyle(4, 0x8f5f2e)
                .setDepth(12)
                .setInteractive({ cursor: 'pointer' });
            const label = this.addGameText(x, y + 44, `${value}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: this.maxValue > 15 ? 18 : 20,
                color: '#7f4c1c',
                stroke: '#fff6df',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5).setDepth(12);
            label.disableInteractive();

            dot.on('pointerup', () => {
                this.selectValue(value);
            });
            dot.on('pointerover', () => {
                if (!this.inputLocked) {
                    dot.setScale(1.08);
                }
            });
            dot.on('pointerout', () => {
                dot.setScale(1);
            });

            this.lineObjects.push(tick, dot, label);
            this.dots.push({ value, x, dot });
        }

        const startDot = this.dots[0];
        this.chicken.setPosition(startDot.x, y - 56);
    }

    selectValue (value: number)
    {
        if (this.inputLocked) {
            return;
        }

        this.inputLocked = true;
        const selectedDot = this.dots.find((dot) => dot.value === value);
        if (!selectedDot) {
            this.inputLocked = false;
            return;
        }

        this.tweens.add({
            targets: this.chicken,
            x: selectedDot.x,
            y: -40,
            duration: 220,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.chicken.setY(-38);
            }
        });

        if (value === this.targetValue) {
            this.sfx.get('correct')?.play();
            this.feedbackText.setText('That is the right spot.');
            selectedDot.dot.setFillStyle(0xdff4b4);
            this.time.delayedCall(900, () => {
                this.generateRound();
            });
            return;
        }

        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(180, 0.002);
        selectedDot.dot.setFillStyle(0xffd9c7);
        this.time.delayedCall(450, () => {
            selectedDot.dot.setFillStyle(0xfff7e3);
            this.feedbackText.setText('');
            this.inputLocked = false;
        });
    }

    clearLine ()
    {
        this.lineObjects.forEach((gameObject) => gameObject.destroy());
        this.lineObjects = [];
        this.dots = [];
    }

    update () {}

    changeScene () {}
}
