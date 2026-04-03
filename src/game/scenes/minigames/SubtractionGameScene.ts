import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import { Howl } from 'howler';
import { NumericKeypad } from './NumericKeypad';

export class SubtractionGameScene extends GameScene
{
    static readonly DEFAULT_PROMPT_Y = -290;
    static readonly DEFAULT_FEEDBACK_Y = 92;
    static readonly SYMBOLIC_PROMPT_Y = -104;
    static readonly SYMBOLIC_FEEDBACK_Y = -18;
    camera!: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.Image;
    promptText!: Phaser.GameObjects.Text;
    helperText!: Phaser.GameObjects.Text;
    equationText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    problem: string;
    solution: number;
    proposedAnswer: string;
    answering: boolean;
    keypad: NumericKeypad | null;
    answerButtons: Phaser.GameObjects.Container[];
    visualObjects: Phaser.GameObjects.GameObject[];
    totalCount: number;
    removedCount: number;
    remainingCount: number;

    constructor ()
    {
        super('SubtractionGameScene', 'Subtraction');
        this.problem = '';
        this.solution = 0;
        this.proposedAnswer = '';
        this.answering = false;
        this.keypad = null;
        this.answerButtons = [];
        this.visualObjects = [];
        this.totalCount = 0;
        this.removedCount = 0;
        this.remainingCount = 0;
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
        this.bgm.set('victory', new Howl({
            src: ['assets/bgm/LOOP_Feel-Good-Victory.ogg'],
            autoplay: false,
            loop: true,
            volume: 0.5
        }));
        this.sfx.set('correct', new Howl({
            src: ['assets/sfx/Jingle_CorrectAnswer.ogg'],
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

        this.promptText = this.addGameText(0, -290, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 54,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.helperText = this.addGameText(0, -235, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#fef7e2',
            stroke: '#273224',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: 840 }
        }).setOrigin(0.5).setDepth(100);

        this.equationText = this.addGameText(0, 96, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#fff5dc',
            stroke: '#26341f',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.feedbackText = this.addGameText(0, 92, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 36,
            color: '#fff5dc',
            stroke: '#26341f',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.helperText.setVisible(false);
        this.equationText.setVisible(false);

        this.rebuildInputMethod();
        this.generateProblem();
        this.watchDifficultyChanges(() => {
            this.rebuildInputMethod();
            this.generateProblem();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.keypad?.destroy();
            this.clearVisuals();
        });
        EventBus.emit('current-scene-ready', this);
    }

    getMaxAnswerValue () {
        const difficultyLevel = this.getDifficultyLevel();
        return difficultyLevel === 1 ? 5 : difficultyLevel === 2 ? 10 : 99;
    }

    usesKeypad () {
        return this.getDifficultyLevel() === 3;
    }

    rebuildInputMethod () {
        this.answerButtons.forEach((button) => button.destroy());
        this.answerButtons = [];
        this.keypad?.destroy();
        this.keypad = null;

        if (this.usesKeypad()) {
            this.keypad = new NumericKeypad({
                scene: this,
                x: 0,
                y: GameScene.KEYPAD_Y,
                onDigit: (digit) => {
                    this.appendDigit(digit);
                },
                onBackspace: () => {
                    this.backspaceDigit();
                },
                onSubmit: () => {
                    this.submitProposedAnswer();
                }
            });
            return;
        }

        this.buildAnswerButtons();
    }

    buildAnswerButtons () {
        const maxValue = this.getMaxAnswerValue();
        const columns = maxValue <= 10 ? 5 : 10;
        const spacing = columns === 5 ? 160 : 94;
        const startX = -((columns - 1) * spacing) / 2;
        const startY = maxValue <= 10 ? GameScene.ANSWER_GRID_Y : GameScene.ANSWER_GRID_COMPACT_Y;
        const rowSpacing = maxValue <= 10 ? GameScene.ANSWER_ROW_SPACING : GameScene.ANSWER_ROW_SPACING_COMPACT;

        for (let index = 0; index < maxValue; index++) {
            const value = index + 1;
            const x = startX + (index % columns) * spacing;
            const y = startY + Math.floor(index / columns) * rowSpacing;
            this.addButton(value, x, y);
        }
    }

    addButton (value: number, x: number, y: number) {
        const compactLayout = this.getMaxAnswerValue() > 10;
        const isVisualLevel = this.getDifficultyLevel() === 1;
        const button = this.add.container(x, y);
        const card = this.add.rectangle(0, 0, compactLayout ? 92 : 118, isVisualLevel ? 102 : 76, 0xfff7e3)
            .setStrokeStyle(6, 0x8f5f2e)
            .setInteractive({ cursor: 'pointer' });
        const text = this.addGameText(0, isVisualLevel ? -16 : 0, `${value}`, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: compactLayout ? 28 : 36,
            color: '#8b4d1d',
            stroke: '#fff8e5',
            strokeThickness: 7,
            align: 'center'
        }).setOrigin(0.5, 0.5);
        text.disableInteractive();
        button.add([card, text]);

        if (isVisualLevel) {
            const spacing = 16;
            const startX = -((value - 1) * spacing) / 2;
            for (let index = 0; index < value; index++) {
                const egg = this.add.ellipse(startX + index * spacing, 22, 11, 15, GameScene.EGG_FILL)
                    .setStrokeStyle(2, 0x8a6230);
                button.add(egg);
            }
        }

        card.on('pointerup', () => {
            this.submitAnswer(value);
        });

        card.on('pointerover', () => {
            button.setScale(1.04);
        });

        card.on('pointerout', () => {
            button.setScale(1);
        });

        this.answerButtons.push(button);
    }

    submitAnswer (answer: number) {
        if (answer === this.solution) {
            this.answering = false;
            this.proposedAnswer = '';
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 1200);
            this.sfx.get('correct')?.play();
            this.showSolvedState();
            this.time.delayedCall(nextRoundDelay, () => {
                this.generateProblem();
            });
            return;
        }

        this.proposedAnswer = '';
        this.markAdaptiveRoundMistake();
        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(200, 0.002);
        this.refreshPromptText();
    }

    appendDigit (digit: string) {
        if (!this.answering || !this.usesKeypad()) {
            return;
        }

        const maxDigits = String(this.getMaxAnswerValue()).length;
        if (this.proposedAnswer.length >= maxDigits) {
            return;
        }

        const nextAnswer = this.proposedAnswer === '0' ? digit : `${this.proposedAnswer}${digit}`;
        if (Number(nextAnswer) > this.getMaxAnswerValue()) {
            return;
        }

        this.proposedAnswer = nextAnswer;
        this.refreshPromptText();
    }

    backspaceDigit () {
        if (!this.answering || !this.usesKeypad()) {
            return;
        }

        this.proposedAnswer = this.proposedAnswer.slice(0, -1);
        this.refreshPromptText();
    }

    submitProposedAnswer () {
        if (!this.answering || !this.usesKeypad() || this.proposedAnswer === '') {
            return;
        }

        this.submitAnswer(Number(this.proposedAnswer));
    }

    generateProblem () {
        this.rebuildInputMethod();
        const difficultyLevel = this.getDifficultyLevel();
        const maxValue = difficultyLevel === 1 ? 5 : difficultyLevel === 2 ? 10 : 99;
        const minTotal = difficultyLevel === 1 ? 2 : difficultyLevel === 2 ? 4 : 14;
        const total = Phaser.Math.Between(minTotal, maxValue);
        const removed = Phaser.Math.Between(1, Math.max(1, total - 1));

        this.totalCount = total;
        this.removedCount = removed;
        this.remainingCount = total - removed;
        this.problem = `${total} - ${removed}`;
        this.solution = this.remainingCount;
        this.proposedAnswer = '';
        this.answering = true;
        this.feedbackText.setText('');
        this.renderProblem();
    }

    renderProblem () {
        const difficultyLevel = this.getDifficultyLevel();
        this.applyTextLayout(difficultyLevel);

        if (difficultyLevel === 1) {
            this.promptText.setText('How many eggs are left?');
            this.feedbackText.setText('');
            this.renderVisualScene(false, false);
            return;
        }

        if (difficultyLevel === 2) {
            this.promptText.setText(`${this.problem} = ?`);
            this.feedbackText.setText('');
            this.renderVisualScene(true, true);
            return;
        }

        this.promptText.setText(`${this.problem} = ${this.proposedAnswer === '' ? '?' : this.proposedAnswer}`);
        this.feedbackText.setText('');
        this.clearVisuals();
    }

    showSolvedState () {
        const difficultyLevel = this.getDifficultyLevel();
        this.applyTextLayout(difficultyLevel);
        this.promptText.setText(`${this.totalCount} - ${this.removedCount} = ${this.remainingCount}`);
        this.feedbackText.setText('That\'s right!');

        if (difficultyLevel <= 2) {
            this.renderVisualScene(true, true, true);
        }
    }

    renderVisualScene (showCounts: boolean, showSideLabels: boolean, highlightAnswer = false) {
        this.clearVisuals();
        const leftCount = highlightAnswer ? this.remainingCount : this.totalCount;
        const difficultyLevel = this.getDifficultyLevel();
        this.createFrameGroup(
            -220,
            -24,
            highlightAnswer
                ? (showCounts ? `${this.remainingCount} left` : 'Left in nest')
                : (showCounts ? `${this.totalCount} in nest` : 'Nest'),
            leftCount,
            difficultyLevel
        );
        this.createFrameGroup(
            220,
            -24,
            showCounts ? `${this.removedCount} away` : 'Rolled away',
            this.removedCount,
            difficultyLevel
        );

        const arrow = this.addGameText(
            0,
            -18,
            showCounts ? `${this.removedCount} rolled away` : 'take away',
            {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 30,
            color: '#fff9e6',
            stroke: '#6d4b2c',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 140 }
        }).setOrigin(0.5).setDepth(35);
        this.visualObjects.push(arrow);
    }

    getFrameSegments (count: number, difficultyLevel: number) {
        if (difficultyLevel === 1) {
            return [{ filled: count, slots: 5 }];
        }

        if (difficultyLevel === 2 || count <= 10) {
            return [{ filled: count, slots: 10 }];
        }

        return [
            { filled: 10, slots: 10 },
            { filled: count - 10, slots: 10 }
        ];
    }

    createFrameGroup (x: number, y: number, label: string, count: number, difficultyLevel: number) {
        const segments = this.getFrameSegments(count, difficultyLevel);
        const startY = y - ((segments.length - 1) * 60) / 2;
        const labelY = segments.length === 1 ? y - 92 : y - 126;

        const labelText = this.addGameText(x, labelY, label, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        this.visualObjects.push(labelText);

        segments.forEach((segment, index) => {
            this.createEggFrame(x, startY + index * 120, segment.filled, segment.slots);
        });
    }

    createEggFrame (x: number, y: number, count: number, slotCount: number) {
        const width = 250;
        const height = slotCount === 5 ? 110 : 160;
        const panel = this.add.rectangle(x, y, width, height, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(20);
        this.visualObjects.push(panel);

        const slotWidth = 38;
        const slotHeight = 34;
        const gap = 8;
        const startX = x - 2 * (slotWidth + gap);
        const startY = y + (slotCount === 5 ? 0 : -26);

        for (let index = 0; index < slotCount; index++) {
            const column = index % 5;
            const row = Math.floor(index / 5);
            const slot = this.add.rectangle(
                startX + column * (slotWidth + gap),
                startY + row * 46,
                slotWidth,
                slotHeight,
                0xfffaee
            ).setStrokeStyle(3, 0x8f6935).setDepth(22);
            this.visualObjects.push(slot);

            if (index < count) {
                const egg = this.add.ellipse(slot.x, slot.y, 20, 28, GameScene.EGG_FILL)
                    .setStrokeStyle(3, 0x8a6230)
                    .setDepth(25);
                this.visualObjects.push(egg);
            }
        }
    }

    clearVisuals () {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
    }

    refreshPromptText () {
        if (!this.answering) {
            return;
        }

        if (this.usesKeypad()) {
            this.promptText.setText(`${this.problem} = ${this.proposedAnswer === '' ? '?' : this.proposedAnswer}`);
            return;
        }

        this.renderProblem();
    }

    applyTextLayout (difficultyLevel: number) {
        if (difficultyLevel === 3) {
            this.promptText.setPosition(0, SubtractionGameScene.SYMBOLIC_PROMPT_Y);
            this.promptText.setFontSize(156);
            this.feedbackText.setPosition(0, SubtractionGameScene.SYMBOLIC_FEEDBACK_Y);
            this.feedbackText.setFontSize(88);
            return;
        }

        this.promptText.setPosition(0, SubtractionGameScene.DEFAULT_PROMPT_Y);
        this.promptText.setFontSize(108);
        this.feedbackText.setPosition(0, SubtractionGameScene.DEFAULT_FEEDBACK_Y);
        this.feedbackText.setFontSize(72);
    }

    update () {}

    changeScene () {}
}
