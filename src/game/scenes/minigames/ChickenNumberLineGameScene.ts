import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type NumberDot = {
    value: number;
    x: number;
    dot: Phaser.GameObjects.Ellipse;
};

type HopPrompt = {
    promptText: string;
    startValue: number;
    targetValue: number;
    hops: number[];
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
    startValue: number;
    hopSteps: number[];
    inputLocked: boolean;

    constructor ()
    {
        super('ChickenNumberLineGameScene', 'Number Line');
        this.lineObjects = [];
        this.dots = [];
        this.maxValue = 10;
        this.targetValue = 0;
        this.startValue = 0;
        this.hopSteps = [];
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
        this.maxValue = difficultyLevel === 3 ? 20 : 10;

        if (difficultyLevel === 1) {
            this.startValue = 0;
            this.targetValue = Phaser.Math.Between(0, this.maxValue);
            this.hopSteps = [this.targetValue];
            this.promptText.setText(`Tap where ${this.targetValue} goes.`);
        } else if (difficultyLevel === 2) {
            const hop = this.buildSingleHopPrompt();
            this.startValue = hop.startValue;
            this.targetValue = hop.targetValue;
            this.hopSteps = hop.hops;
            this.promptText.setText(hop.promptText);
        } else {
            const hop = this.buildTwoStepPrompt();
            this.startValue = hop.startValue;
            this.targetValue = hop.targetValue;
            this.hopSteps = hop.hops;
            this.promptText.setText(hop.promptText);
        }

        this.renderLine(difficultyLevel > 1);
    }

    buildSingleHopPrompt ()
    {
        const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const hopSize = Phaser.Math.Between(1, 3);
        const minStart = direction === -1 ? hopSize : 0;
        const maxStart = direction === 1 ? this.maxValue - hopSize : this.maxValue;
        const startValue = Phaser.Math.Between(minStart, maxStart);
        const targetValue = startValue + direction * hopSize;

        return {
            startValue,
            targetValue,
            hops: [direction * hopSize],
            promptText: `The chicken starts on ${startValue}. Hop ${hopSize} ${direction === 1 ? 'more' : 'less'}.`
        };
    }

    buildTwoStepPrompt ()
    {
        for (let attempt = 0; attempt < 40; attempt += 1) {
            const startValue = Phaser.Math.Between(4, this.maxValue - 4);
            const firstDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
            const secondDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
            const firstHop = Phaser.Math.Between(2, 5);
            const secondHop = Phaser.Math.Between(1, 4);
            const afterFirst = startValue + firstDirection * firstHop;
            const targetValue = afterFirst + secondDirection * secondHop;

            if (afterFirst < 0 || afterFirst > this.maxValue || targetValue < 0 || targetValue > this.maxValue) {
                continue;
            }

            return {
                startValue,
                targetValue,
                hops: [firstDirection * firstHop, secondDirection * secondHop],
                promptText: `Start on ${startValue}. Hop ${firstHop} ${firstDirection === 1 ? 'right' : 'left'}, then ${secondHop} ${secondDirection === 1 ? 'right' : 'left'}.`
            };
        }

        return {
            startValue: 10,
            targetValue: 13,
            hops: [3],
            promptText: 'Start on 10. Hop 3 right.'
        };
    }

    renderLine (showStartMarker: boolean)
    {
        this.clearLine();
        const y = 18;
        const startX = -390;
        const endX = 390;
        const dotSize = this.maxValue > 10 ? 24 : 30;
        const panel = this.add.rectangle(0, 28, 860, 224, 0xfff5d6, 0.94)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(6);
        const panelLabel = this.addGameText(0, -62, 'Number Line', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(7);
        const line = this.add.rectangle(0, y, endX - startX + 6, 8, 0x8f5f2e).setDepth(8);
        this.lineObjects.push(panel, panelLabel, line);
        this.dots = [];

        for (let value = 0; value <= this.maxValue; value++) {
            const x = Phaser.Math.Linear(startX, endX, value / this.maxValue);
            const tick = this.add.rectangle(x, y, 4, 28, 0x8f5f2e).setDepth(10);
            const dot = this.add.ellipse(x, y, dotSize, dotSize, 0xfff7e3)
                .setStrokeStyle(4, 0x8f5f2e)
                .setDepth(12)
                .setInteractive({ cursor: 'pointer' });

            if (showStartMarker && value === this.startValue) {
                dot.setFillStyle(0xffe7ae);
            }

            this.lineObjects.push(tick, dot);

            const label = this.addGameText(x, y + 44, `${value}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: this.maxValue > 10 ? 16 : 20,
                color: '#7f4c1c',
                stroke: '#fff6df',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5).setDepth(12);
            label.disableInteractive();
            this.lineObjects.push(label);

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

            this.dots.push({ value, x, dot });
        }

        const startDot = this.dots.find((dot) => dot.value === this.startValue) ?? this.dots[0];
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

        if (value === this.targetValue) {
            this.sfx.get('correct')?.play();
            this.feedbackText.setText('That is the right spot.');
            selectedDot.dot.setFillStyle(0xdff4b4);
            this.animateChickenPath(value === this.targetValue ? this.getHopLandingValues() : [value], () => {
                this.time.delayedCall(600, () => {
                    this.generateRound();
                });
            });
            return;
        }

        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(180, 0.002);
        selectedDot.dot.setFillStyle(0xffd9c7);
        this.animateChickenPath([value], () => {
            this.time.delayedCall(450, () => {
                const startDot = this.dots.find((dot) => dot.value === this.startValue);
                selectedDot.dot.setFillStyle(selectedDot.value === this.startValue ? 0xffe7ae : 0xfff7e3);
                this.feedbackText.setText('');
                if (startDot) {
                    this.tweens.add({
                        targets: this.chicken,
                        x: startDot.x,
                        y: -38,
                        duration: 180,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            this.inputLocked = false;
                        }
                    });
                    return;
                }
                this.inputLocked = false;
            });
        });
    }

    getHopLandingValues ()
    {
        const values: number[] = [];
        let currentValue = this.startValue;

        this.hopSteps.forEach((hop) => {
            const direction = hop > 0 ? 1 : -1;

            for (let step = 0; step < Math.abs(hop); step += 1) {
                currentValue += direction;
                values.push(currentValue);
            }
        });

        if (values.length === 0) {
            values.push(this.targetValue);
        }

        return values;
    }

    animateChickenPath (values: number[], onComplete: () => void)
    {
        let previousValue = this.startValue;

        const runStep = (index: number) => {
            if (index >= values.length) {
                onComplete();
                return;
            }

            const targetDot = this.dots.find((dot) => dot.value === values[index]);
            if (!targetDot) {
                runStep(index + 1);
                return;
            }

            const previousDot = this.dots.find((dot) => dot.value === previousValue);
            const startX = this.chicken.x;
            const hopUpY = -72;
            const landingY = -38;

            this.tweens.add({
                targets: this.chicken,
                x: (startX + targetDot.x) / 2,
                y: hopUpY,
                duration: 180,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: this.chicken,
                        x: targetDot.x,
                        y: landingY,
                        duration: 190,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            if (previousDot && previousDot.value !== this.startValue) {
                                previousDot.dot.setFillStyle(0xfff7e3);
                            }
                            targetDot.dot.setFillStyle(0xffe7ae);
                            previousValue = targetDot.value;
                            this.tweens.add({
                                targets: this.chicken,
                                y: landingY - 2,
                                duration: 60,
                                ease: 'Sine.easeOut',
                                yoyo: true,
                                onComplete: () => {
                                    runStep(index + 1);
                                }
                            });
                        }
                    });
                }
            });
        };

        runStep(0);
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
