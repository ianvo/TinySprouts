import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import { NumericKeypad } from './NumericKeypad';

export class MissingEggBasketGameScene extends GameScene
{
    static readonly DEFAULT_PROMPT_Y = -290;
    static readonly DEFAULT_FEEDBACK_Y = -194;
    static readonly SYMBOLIC_PROMPT_Y = -104;
    static readonly SYMBOLIC_FEEDBACK_Y = -18;
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    leftCount: number;
    rightCount: number;
    totalCount: number;
    missingOnLeft: boolean;
    solution: number;
    proposedAnswer: string;
    keypad: NumericKeypad | null;
    answerButtons: Phaser.GameObjects.Container[];
    visualObjects: Phaser.GameObjects.GameObject[];

    constructor ()
    {
        super('MissingEggBasketGameScene', 'Missing Addends');
        this.leftCount = 0;
        this.rightCount = 0;
        this.totalCount = 0;
        this.missingOnLeft = false;
        this.solution = 0;
        this.proposedAnswer = '';
        this.keypad = null;
        this.answerButtons = [];
        this.visualObjects = [];
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.useFixedStageCamera(this.camera);
        this.camera.setBackgroundColor('rgba(0,0,0,0)');

        this.bgm.set('gameplay', new Howl({
            src: ['assets/bgm/Theme_5_PartyTime_Loop.ogg'],
            autoplay: true,
            loop: true,
            volume: 0.3,
            html5: true
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

        this.promptText = this.addGameText(0, MissingEggBasketGameScene.DEFAULT_PROMPT_Y, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 52,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.feedbackText = this.addGameText(0, MissingEggBasketGameScene.DEFAULT_FEEDBACK_Y, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#fff7df',
            stroke: '#2d3d24',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.rebuildInput();
        this.generateRound();
        this.watchDifficultyChanges(() => {
            this.rebuildInput();
            this.generateRound();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.keypad?.destroy();
            this.clearButtons();
            this.clearVisuals();
        });
        EventBus.emit('current-scene-ready', this);
    }

    usesKeypad ()
    {
        return this.getDifficultyLevel() === 3;
    }

    getMaxAnswerValue ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        return difficultyLevel === 1 ? 5 : difficultyLevel === 2 ? 10 : 20;
    }

    rebuildInput ()
    {
        this.clearButtons();
        this.keypad?.destroy();
        this.keypad = null;

        if (this.usesKeypad()) {
            this.keypad = new NumericKeypad({
                scene: this,
                x: 0,
                y: GameScene.KEYPAD_Y,
                onDigit: (digit) => {
                    const maxDigits = String(this.getMaxAnswerValue()).length;
                    if (this.proposedAnswer.length < maxDigits) {
                        const nextAnswer = this.proposedAnswer === '0' ? digit : `${this.proposedAnswer}${digit}`;
                        if (Number(nextAnswer) <= this.getMaxAnswerValue()) {
                            this.proposedAnswer = nextAnswer;
                            this.refreshPromptText();
                        }
                    }
                },
                onBackspace: () => {
                    this.proposedAnswer = this.proposedAnswer.slice(0, -1);
                    this.refreshPromptText();
                },
                onSubmit: () => {
                    if (this.proposedAnswer !== '') {
                        this.submitAnswer(Number(this.proposedAnswer));
                    }
                }
            });
            return;
        }

        const maxValue = this.getMaxAnswerValue();
        const columns = 5;
        const spacing = 132;
        const startX = -((columns - 1) * spacing) / 2;
        const startY = GameScene.ANSWER_GRID_Y;
        const rowSpacing = GameScene.ANSWER_ROW_SPACING;

        for (let index = 0; index < maxValue; index++) {
            const value = index + 1;
            const x = startX + (index % columns) * spacing;
            const y = startY + Math.floor(index / columns) * rowSpacing;
            this.addAnswerButton(value, x, y);
        }
    }

    addAnswerButton (value: number, x: number, y: number)
    {
        const isVisualLevel = this.getDifficultyLevel() === 1;
        const button = this.add.container(x, y);
        const sprite = this.add.sprite(0, 0, 'button');
        sprite.setScale(isVisualLevel ? 2.05 : 1.85);
        sprite.setInteractive({ cursor: 'pointer' });
        const label = this.addGameText(0, isVisualLevel ? -22 : 0, `${value}`, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 38,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        label.disableInteractive();
        button.add([sprite, label]);

        if (isVisualLevel) {
            const spacing = 18;
            const startX = -((value - 1) * spacing) / 2;
            for (let index = 0; index < value; index++) {
                const egg = this.add.ellipse(startX + index * spacing, 18, 12, 16, GameScene.EGG_FILL)
                    .setStrokeStyle(2, 0x8a6230);
                button.add(egg);
            }
        }

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

    generateRound ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        this.proposedAnswer = '';
        this.feedbackText.setText('');
        this.clearVisuals();
        this.applyTextLayout(difficultyLevel);

        if (difficultyLevel === 1) {
            this.totalCount = Phaser.Math.Between(3, 5);
        }
        else if (difficultyLevel === 2) {
            this.totalCount = Phaser.Math.Between(4, 10);
        }
        else {
            this.totalCount = Phaser.Math.Between(8, 20);
        }

        const firstPartMin = difficultyLevel === 3 ? 2 : 1;
        this.leftCount = Phaser.Math.Between(firstPartMin, this.totalCount - 1);
        this.rightCount = this.totalCount - this.leftCount;
        this.missingOnLeft = Phaser.Math.Between(0, 1) === 0;
        this.solution = this.missingOnLeft ? this.leftCount : this.rightCount;

        this.renderRound();
    }

    renderRound ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        if (difficultyLevel === 3) {
            this.promptText.setText(
                this.missingOnLeft
                    ? `? + ${this.rightCount} = ${this.totalCount}`
                    : `${this.leftCount} + ? = ${this.totalCount}`
            );
            return;
        }

        this.promptText.setText('How many eggs are missing?');
        this.renderVisualEquation();
    }

    renderVisualEquation ()
    {
        const leftLabel = this.missingOnLeft ? '?' : `${this.leftCount}`;
        const rightLabel = this.missingOnLeft ? `${this.rightCount}` : '?';
        const leftCount = this.missingOnLeft ? 0 : this.leftCount;
        const rightCount = this.missingOnLeft ? this.rightCount : 0;
        const slotCount = this.getDifficultyLevel() === 1 ? 5 : 10;

        this.createBasket(-220, -28, leftLabel, leftCount, slotCount, this.missingOnLeft);
        this.createBasket(0, -28, rightLabel, rightCount, slotCount, !this.missingOnLeft && this.solution > 0);
        this.createBasket(220, -28, `${this.totalCount}`, this.totalCount, slotCount, false);

        const plus = this.addGameText(-110, -28, '+', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 56,
            color: '#ffffff',
            stroke: '#2d3d24',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(30);
        const equals = this.addGameText(110, -28, '=', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 56,
            color: '#ffffff',
            stroke: '#2d3d24',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(30);
        this.visualObjects.push(plus, equals);
    }

    createBasket (x: number, y: number, label: string, count: number, slotCount: number, showMissing: boolean)
    {
        const width = 178;
        const height = slotCount === 5 ? 96 : 142;
        const panel = this.add.rectangle(x, y, width, height, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        const labelText = this.addGameText(x, y - height / 2 - 20, label, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 30,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        this.visualObjects.push(panel, labelText);

        const slotWidth = 24;
        const slotHeight = 22;
        const gap = 6;
        const startX = x - 2 * (slotWidth + gap);
        const startY = y + (slotCount === 5 ? 0 : -16);

        for (let index = 0; index < slotCount; index++) {
            const column = index % 5;
            const row = Math.floor(index / 5);
            const slot = this.add.rectangle(
                startX + column * (slotWidth + gap),
                startY + row * 32,
                slotWidth,
                slotHeight,
                showMissing ? 0xffe6b1 : 0xfffaee
            ).setStrokeStyle(2, 0x8f6935).setDepth(12);
            this.visualObjects.push(slot);

            if (index < count) {
                const egg = this.add.ellipse(slot.x, slot.y, 14, 18, GameScene.EGG_FILL)
                    .setStrokeStyle(2, 0x8a6230)
                    .setDepth(14);
                this.visualObjects.push(egg);
            }
        }
    }

    submitAnswer (value: number)
    {
        if (value === this.solution) {
            this.sfx.get('correct')?.play();
            this.feedbackText.setText('That fits.');
            this.time.delayedCall(850, () => {
                this.generateRound();
            });
            return;
        }

        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(180, 0.002);
        this.time.delayedCall(450, () => {
            this.feedbackText.setText('');
        });
    }

    refreshPromptText ()
    {
        if (!this.usesKeypad()) {
            return;
        }

        this.promptText.setText(
            this.missingOnLeft
                ? `${this.proposedAnswer === '' ? '?' : this.proposedAnswer} + ${this.rightCount} = ${this.totalCount}`
                : `${this.leftCount} + ${this.proposedAnswer === '' ? '?' : this.proposedAnswer} = ${this.totalCount}`
        );
    }

    applyTextLayout (difficultyLevel: number)
    {
        if (difficultyLevel === 3) {
            this.promptText.setPosition(0, MissingEggBasketGameScene.SYMBOLIC_PROMPT_Y);
            this.promptText.setFontSize(156);
            this.feedbackText.setPosition(0, MissingEggBasketGameScene.SYMBOLIC_FEEDBACK_Y);
            this.feedbackText.setFontSize(88);
            return;
        }

        this.promptText.setPosition(0, MissingEggBasketGameScene.DEFAULT_PROMPT_Y);
        this.promptText.setFontSize(104);
        this.feedbackText.setPosition(0, MissingEggBasketGameScene.DEFAULT_FEEDBACK_Y);
        this.feedbackText.setFontSize(68);
    }

    clearButtons ()
    {
        this.answerButtons.forEach((button) => button.destroy());
        this.answerButtons = [];
    }

    clearVisuals ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
    }

    update () {}

    changeScene () {}
}
