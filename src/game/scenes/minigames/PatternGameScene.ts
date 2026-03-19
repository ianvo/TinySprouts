import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import { Howl } from 'howler';
import { NumericKeypad } from './NumericKeypad';
import { CropName } from '../../crops';

type PatternSymbol = 'tomato' | 'corn' | 'carrot';

export class PatternGameScene extends GameScene
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
    optionCards: Phaser.GameObjects.Container[];
    visualObjects: Phaser.GameObjects.GameObject[];
    visualPattern: PatternSymbol[];
    visualSolution: PatternSymbol;

    constructor ()
    {
        super('PatternGameScene', 'Patterns');
        this.problem = '';
        this.solution = 0;
        this.proposedAnswer = '';
        this.answering = false;
        this.keypad = null;
        this.answerButtons = [];
        this.optionCards = [];
        this.visualObjects = [];
        this.visualPattern = [];
        this.visualSolution = 'tomato';
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

        this.promptText = this.addGameText(0, -290, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 52,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.helperText = this.addGameText(0, -238, '', {
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
            fontSize: 32,
            color: '#fff5dc',
            stroke: '#26341f',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 780 }
        }).setOrigin(0.5).setDepth(100);

        this.feedbackText = this.addGameText(0, 92, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 36,
            color: '#fff5dc',
            stroke: '#26341f',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 780 }
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
            this.clearOptionCards();
        });
        EventBus.emit('current-scene-ready', this);
    }

    getMaxAnswerValue () {
        const difficultyLevel = this.getDifficultyLevel();
        return difficultyLevel === 2 ? 20 : 99;
    }

    usesKeypad () {
        return this.getDifficultyLevel() === 3;
    }

    rebuildInputMethod () {
        this.answerButtons.forEach((button) => button.destroy());
        this.answerButtons = [];
        this.clearOptionCards();
        this.keypad?.destroy();
        this.keypad = null;

        if (this.getDifficultyLevel() === 1) {
            return;
        }

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
        const columns = 10;
        const spacing = 94;
        const startX = -((columns - 1) * spacing) / 2;
        const startY = GameScene.ANSWER_GRID_COMPACT_Y;
        const rowSpacing = GameScene.ANSWER_ROW_SPACING_COMPACT;

        for (let index = 0; index < maxValue; index++) {
            const value = index + 1;
            const x = startX + (index % columns) * spacing;
            const y = startY + Math.floor(index / columns) * rowSpacing;
            this.addButton(value, x, y);
        }
    }

    addButton (value: number, x: number, y: number) {
        const button = this.add.container(x, y);
        const sprite = this.add.sprite(0, 0, 'button');
        sprite.setScale(1.62);
        sprite.setOrigin(0.5, 0.5);
        sprite.setInteractive({ cursor: 'pointer' });
        const text = this.addGameText(0, 0, `${value}`, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 30,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5, 0.5);
        text.disableInteractive();
        button.add([sprite, text]);

        sprite.on('pointerup', () => {
            this.submitNumericAnswer(value);
        });

        sprite.on('pointerover', () => {
            button.setScale(1.06);
        });

        sprite.on('pointerout', () => {
            button.setScale(1);
        });

        this.answerButtons.push(button);
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

        this.submitNumericAnswer(Number(this.proposedAnswer));
    }

    generateProblem () {
        this.proposedAnswer = '';
        this.answering = true;
        this.feedbackText.setText('');
        this.clearVisuals();
        this.clearOptionCards();

        const difficultyLevel = this.getDifficultyLevel();
        this.applyTextLayout(difficultyLevel);
        if (difficultyLevel === 1) {
            this.generateVisualPattern();
            return;
        }

        const visibleTerms = 5;
        const sequence: number[] = [];

        if (difficultyLevel === 2) {
            const maxValue = 20;
            const diff = Phaser.Math.Between(1, 3);
            const start = Phaser.Math.Between(1, maxValue - diff * visibleTerms);

            for (let index = 0; index < visibleTerms; index++) {
                sequence.push(start + diff * index);
            }
            this.solution = start + diff * visibleTerms;
        }
        else {
            const levelThreePattern = this.createLevelThreePattern(visibleTerms);
            sequence.push(...levelThreePattern.sequence);
            this.solution = levelThreePattern.solution;
        }

        this.problem = sequence.join('   ');
        this.renderNumericPattern(sequence);
    }

    createLevelThreePattern (visibleTerms: number) {
        const patternTypes: Array<'increase' | 'decrease' | 'alternate-up' | 'alternate-down' | 'alternate-mixed'> = [
            'increase',
            'decrease',
            'alternate-up',
            'alternate-down',
            'alternate-mixed'
        ];

        for (let attempt = 0; attempt < 80; attempt++) {
            const patternType = Phaser.Utils.Array.GetRandom(patternTypes);
            const candidate = patternType === 'increase'
                ? this.createSteadyPattern(visibleTerms, 1)
                : patternType === 'decrease'
                    ? this.createSteadyPattern(visibleTerms, -1)
                    : patternType === 'alternate-up'
                        ? this.createAlternatingPattern(visibleTerms, 'up')
                        : patternType === 'alternate-down'
                            ? this.createAlternatingPattern(visibleTerms, 'down')
                            : this.createAlternatingPattern(visibleTerms, 'mixed');

            if (candidate) {
                return candidate;
            }
        }

        return this.createSteadyPattern(visibleTerms, 1) ?? {
            sequence: [10, 15, 20, 25, 30],
            solution: 35
        };
    }

    createSteadyPattern (visibleTerms: number, direction: 1 | -1) {
        const diff = Phaser.Math.Between(2, 12) * direction;
        const minValue = 1;
        const maxValue = 99;
        const start = direction > 0
            ? Phaser.Math.Between(1, maxValue - Math.abs(diff) * visibleTerms)
            : Phaser.Math.Between(minValue + Math.abs(diff) * visibleTerms, maxValue);

        const values = [start];
        for (let index = 0; index < visibleTerms; index++) {
            values.push(values[index] + diff);
        }

        if (!this.isValidLevelThreeSequence(values)) {
            return null;
        }

        return {
            sequence: values.slice(0, visibleTerms),
            solution: values[visibleTerms]
        };
    }

    createAlternatingPattern (visibleTerms: number, mode: 'up' | 'down' | 'mixed') {
        const stepA = Phaser.Math.Between(2, 10);
        let stepB = Phaser.Math.Between(2, 10);
        if (stepB === stepA) {
            stepB = Math.min(12, stepB + 2);
        }

        const deltas = mode === 'up'
            ? [stepA, stepB]
            : mode === 'down'
                ? [-stepA, -stepB]
                : Phaser.Utils.Array.GetRandom([
                    [stepA, -stepB],
                    [-stepA, stepB]
                ]);

        for (let attempt = 0; attempt < 20; attempt++) {
            const start = Phaser.Math.Between(8, 92);
            const values = [start];
            for (let index = 0; index < visibleTerms; index++) {
                values.push(values[index] + deltas[index % 2]);
            }

            if (!this.isValidLevelThreeSequence(values)) {
                continue;
            }

            return {
                sequence: values.slice(0, visibleTerms),
                solution: values[visibleTerms]
            };
        }

        return null;
    }

    isValidLevelThreeSequence (values: number[]) {
        return values.every((value) => value >= 1 && value <= 99)
            && new Set(values).size === values.length;
    }

    generateVisualPattern () {
        const motif = this.createVisualMotif();
        const visibleTerms = 6;
        const fullPattern = Array.from({ length: visibleTerms + 1 }, (_, index) => motif[index % motif.length]);
        this.visualPattern = fullPattern;
        this.visualSolution = fullPattern[visibleTerms];

        this.promptText.setText('What comes next in the pattern?');
        this.feedbackText.setText('');

        this.renderVisualPattern();
        this.createVisualOptions();
    }

    createVisualMotif () {
        const symbols: PatternSymbol[] = ['tomato', 'corn', 'carrot'];

        while (true) {
            const motifLength = Phaser.Math.Between(2, 3);
            const motif = Array.from({ length: motifLength }, () => Phaser.Utils.Array.GetRandom(symbols));
            const uniqueCount = new Set(motif).size;

            if (uniqueCount < 2) {
                continue;
            }

            if (motifLength === 3 && motif[0] === motif[2]) {
                continue;
            }

            return motif;
        }
    }

    renderVisualPattern () {
        const slotCount = this.visualPattern.length;
        const spacing = 132;
        const slotSize = 108;
        const startX = -((slotCount - 1) * spacing) / 2;
        const y = -10;

        for (let index = 0; index < slotCount; index++) {
            const x = startX + index * spacing;
            const slot = this.add.rectangle(x, y, slotSize, slotSize, 0xfff6d9)
                .setStrokeStyle(6, 0x966131)
                .setDepth(20);
            this.visualObjects.push(slot);

            if (index === slotCount - 1) {
                const question = this.addGameText(x, y, '?', {
                    fontFamily: GameScene.FONT_FAMILY,
                    fontSize: 48,
                    color: '#7d4a1b',
                    stroke: '#fff7df',
                    strokeThickness: 8
                }).setOrigin(0.5).setDepth(25);
                this.visualObjects.push(question);
                continue;
            }

            const icon = this.createPatternIcon(this.visualPattern[index], x, y, 0.62);
            this.visualObjects.push(icon);
        }
    }

    createVisualOptions () {
        const allSymbols: PatternSymbol[] = ['tomato', 'corn', 'carrot'];
        const choices = Phaser.Utils.Array.Shuffle([
            this.visualSolution,
            ...allSymbols.filter((symbol) => symbol !== this.visualSolution).slice(0, 2)
        ]);

        choices.forEach((symbol, index) => {
            const x = -220 + index * 220;
            const y = GameScene.VISUAL_OPTION_Y;
            const container = this.add.container(x, y).setDepth(80);
            const card = this.add.rectangle(0, 0, 170, 120, 0xfff7e3)
                .setStrokeStyle(5, 0x966131)
                .setInteractive({ cursor: 'pointer' });
            const icon = this.createPatternIcon(symbol, 0, -6, 0.64);
            const label = this.addGameText(0, 38, this.getPatternLabel(symbol), {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 22,
                color: '#7d4a1b',
                stroke: '#fff7df',
                strokeThickness: 6
            }).setOrigin(0.5);

            container.add([card, icon, label]);

            card.on('pointerup', () => {
                this.submitVisualAnswer(symbol);
            });
            card.on('pointerover', () => {
                container.setScale(1.05);
            });
            card.on('pointerout', () => {
                container.setScale(1);
            });

            this.optionCards.push(container);
        });
    }

    renderNumericPattern (sequence: number[]) {
        const difficultyLevel = this.getDifficultyLevel();
        this.promptText.setText(
            difficultyLevel === 2
                ? `${sequence.join('   ')}   ?`
                : `${this.problem}   ${this.proposedAnswer === '' ? '?' : this.proposedAnswer}`
        );
        this.feedbackText.setText('');
    }

    createPatternIcon (symbol: PatternSymbol, x: number, y: number, scale: number) {
        return this.addCropSprite(x, y, symbol as CropName)
            .setOrigin(0.5, 0.64)
            .setScale(0.6 * scale)
            .setDepth(25);
    }

    getPatternLabel (symbol: PatternSymbol) {
        if (symbol === 'tomato') {
            return 'Tomato';
        }

        if (symbol === 'corn') {
            return 'Corn';
        }

        return 'Carrot';
    }

    submitVisualAnswer (answer: PatternSymbol) {
        if (!this.answering || this.getDifficultyLevel() !== 1) {
            return;
        }

        if (answer === this.visualSolution) {
            this.answering = false;
            this.sfx.get('correct')?.play();
            this.promptText.setText('That fits the pattern!');
            this.feedbackText.setText('Nice job.');
            this.revealVisualSolution();
            this.time.delayedCall(1200, () => {
                this.generateProblem();
            });
            return;
        }

        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(200, 0.002);
    }

    revealVisualSolution () {
        const spacing = 132;
        const x = -((this.visualPattern.length - 1) * spacing) / 2 + (this.visualPattern.length - 1) * spacing;
        const icon = this.createPatternIcon(this.visualSolution, x, -10, 0.62);
        this.visualObjects.push(icon);
    }

    submitNumericAnswer (answer: number) {
        this.applyTextLayout(this.getDifficultyLevel());
        if (answer === this.solution) {
            this.answering = false;
            this.proposedAnswer = '';
            this.sfx.get('correct')?.play();
            this.promptText.setText(`${this.problem}   ${this.solution}`);
            this.feedbackText.setText('That\'s right!');
            this.time.delayedCall(1200, () => {
                this.generateProblem();
            });
            return;
        }

        this.proposedAnswer = '';
        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(200, 0.002);
        this.refreshPromptText();
    }

    clearVisuals () {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
    }

    clearOptionCards () {
        this.optionCards.forEach((card) => card.destroy());
        this.optionCards = [];
    }

    refreshPromptText () {
        if (!this.answering || !this.usesKeypad()) {
            return;
        }

        this.applyTextLayout(this.getDifficultyLevel());
        this.promptText.setText(`${this.problem}   ${this.proposedAnswer === '' ? '?' : this.proposedAnswer}`);
    }

    applyTextLayout (difficultyLevel: number) {
        if (difficultyLevel === 3) {
            this.promptText.setPosition(0, PatternGameScene.SYMBOLIC_PROMPT_Y);
            this.promptText.setFontSize(156);
            this.feedbackText.setPosition(0, PatternGameScene.SYMBOLIC_FEEDBACK_Y);
            this.feedbackText.setFontSize(88);
            return;
        }

        this.promptText.setPosition(0, PatternGameScene.DEFAULT_PROMPT_Y);
        this.promptText.setFontSize(104);
        this.feedbackText.setPosition(0, PatternGameScene.DEFAULT_FEEDBACK_Y);
        this.feedbackText.setFontSize(72);
    }

    update () {}

    changeScene () {}
}
