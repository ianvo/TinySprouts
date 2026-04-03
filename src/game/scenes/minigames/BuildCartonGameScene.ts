import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type NumberChoice = {
    value: number;
    container: Phaser.GameObjects.Container;
};

export class BuildCartonGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    helperText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    tensCount: number;
    onesCount: number;
    solution: number;
    answerCards: NumberChoice[];
    visualObjects: Phaser.GameObjects.GameObject[];

    constructor ()
    {
        super('BuildCartonGameScene', 'Place Value');
        this.tensCount = 1;
        this.onesCount = 0;
        this.solution = 10;
        this.answerCards = [];
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

        this.promptText = this.addGameText(0, -292, 'How many eggs are there?', {
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

        this.feedbackText = this.addGameText(0, -194, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#fff7df',
            stroke: '#2d3d24',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.generateRound();
        this.watchDifficultyChanges(() => {
            this.generateRound();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearVisuals();
            this.clearAnswerCards();
        });
        EventBus.emit('current-scene-ready', this);
    }

    generateRound ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        if (difficultyLevel === 1) {
            this.tensCount = 1;
            this.onesCount = Phaser.Math.Between(1, 5);
            this.helperText.setText('One full carton is 10 eggs.');
        }
        else if (difficultyLevel === 2) {
            this.tensCount = Phaser.Math.Between(1, 2);
            this.onesCount = Phaser.Math.Between(0, 9);
            this.helperText.setText('Count the full cartons by tens.');
        }
        else {
            this.tensCount = Phaser.Math.Between(1, 9);
            this.onesCount = Phaser.Math.Between(0, 9);
            this.helperText.setText('Count the cartons and the extra eggs.');
        }

        this.solution = this.tensCount * 10 + this.onesCount;
        this.feedbackText.setText('');
        this.renderVisuals();
        this.buildAnswerCards();
    }

    renderVisuals ()
    {
        this.clearVisuals();
        const difficultyLevel = this.getDifficultyLevel();
        const showLabeledFullCartons = difficultyLevel === 3;
        const tensLabelText = difficultyLevel === 2
            ? `${this.tensCount} full carton${this.tensCount === 1 ? '' : 's'}`
            : 'Full cartons';

        const tensLabel = this.addGameText(0, -154, tensLabelText, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 22,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        this.visualObjects.push(tensLabel);

        if (showLabeledFullCartons) {
            const itemCount = this.tensCount + (this.onesCount > 0 ? 1 : 0);
            const columns = 3;
            const spacingX = 206;
            const spacingY = 86;
            const startX = -((columns - 1) * spacingX) / 2;
            const rows = Math.ceil(itemCount / columns);
            const startY = rows >= 4 ? -108 : rows === 3 ? -92 : rows === 2 ? -74 : -60;

            for (let index = 0; index < itemCount; index++) {
                const x = startX + (index % columns) * spacingX;
                const y = startY + Math.floor(index / columns) * spacingY;

                if (index < this.tensCount) {
                    this.createFullCarton(x, y);
                }
                else {
                    this.createMiniCarton(x, y, this.onesCount);
                }
            }
        }
        else {
            const columns = 3;
            const spacingX = 200;
            const spacingY = 100;
            const startX = -((columns - 1) * spacingX) / 2;
            const startY = this.tensCount > 6 ? -74 : this.tensCount > 3 ? -60 : -44;

            for (let index = 0; index < this.tensCount; index++) {
                const x = startX + (index % columns) * spacingX;
                const y = startY + Math.floor(index / columns) * spacingY;
                this.createCarton(x, y, 10);
            }

            const onesY = this.tensCount > 6 ? 138 : 122;
            const onesLabel = this.addGameText(0, onesY - 76, 'Extra eggs', {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 22,
                color: '#7f4c1c',
                stroke: '#fff6df',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(20);
            this.visualObjects.push(onesLabel);
            this.createCarton(0, onesY, this.onesCount);
        }
    }

    createCarton (x: number, y: number, filledCount: number)
    {
        const panel = this.add.rectangle(x, y, 178, 90, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        this.visualObjects.push(panel);

        const slotWidth = 24;
        const slotHeight = 22;
        const gap = 6;
        const startX = x - 2 * (slotWidth + gap);
        const startY = y - 16;

        for (let index = 0; index < 10; index++) {
            const column = index % 5;
            const row = Math.floor(index / 5);
            const slot = this.add.rectangle(
                startX + column * (slotWidth + gap),
                startY + row * 32,
                slotWidth,
                slotHeight,
                0xfffaee
            ).setStrokeStyle(2, 0x8f6935).setDepth(12);
            this.visualObjects.push(slot);

            if (index < filledCount) {
                const egg = this.add.ellipse(slot.x, slot.y, 14, 18, GameScene.EGG_FILL)
                    .setStrokeStyle(2, 0x8a6230)
                    .setDepth(14);
                this.visualObjects.push(egg);
            }
        }
    }

    createFullCarton (x: number, y: number)
    {
        const panel = this.add.rectangle(x, y, 152, 72, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        const label = this.addGameText(x, y, 'Full', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 26,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        this.visualObjects.push(panel, label);
    }

    createMiniCarton (x: number, y: number, filledCount: number)
    {
        const panel = this.add.rectangle(x, y, 152, 72, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        this.visualObjects.push(panel);

        const slotWidth = 18;
        const slotHeight = 16;
        const gap = 4;
        const startX = x - 2 * (slotWidth + gap);
        const startY = y - 12;

        for (let index = 0; index < 10; index++) {
            const column = index % 5;
            const row = Math.floor(index / 5);
            const slot = this.add.rectangle(
                startX + column * (slotWidth + gap),
                startY + row * 22,
                slotWidth,
                slotHeight,
                0xfffaee
            ).setStrokeStyle(2, 0x8f6935).setDepth(12);
            this.visualObjects.push(slot);

            if (index < filledCount) {
                const egg = this.add.ellipse(slot.x, slot.y, 12, 15, GameScene.EGG_FILL)
                    .setStrokeStyle(2, 0x8a6230)
                    .setDepth(14);
                this.visualObjects.push(egg);
            }
        }
    }

    buildAnswerCards ()
    {
        this.clearAnswerCards();
        const optionCount = this.getDifficultyLevel() === 1 ? 2 : 3;
        const values = Phaser.Utils.Array.Shuffle([
            this.solution,
            ...this.getDistractors(optionCount - 1)
        ]);
        const positions = values.length === 2 ? [-150, 150] : [-250, 0, 250];

        values.forEach((value, index) => {
            const container = this.add.container(positions[index], GameScene.VISUAL_OPTION_Y).setDepth(40);
            const card = this.add.rectangle(0, 0, 180, 92, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ cursor: 'pointer' });
            const label = this.addGameText(0, 0, `${value}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 40,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 7,
                align: 'center'
            }).setOrigin(0.5);
            label.disableInteractive();

            container.add([card, label]);

            card.on('pointerup', () => {
                this.submitAnswer(value);
            });
            card.on('pointerover', () => {
                container.setScale(1.04);
            });
            card.on('pointerout', () => {
                container.setScale(1);
            });

            this.answerCards.push({ value, container });
        });
    }

    getDistractors (count: number)
    {
        const values = new Set<number>();
        const difficultyLevel = this.getDifficultyLevel();
        const minValue = difficultyLevel === 1 ? 11 : difficultyLevel === 2 ? 20 : 10;
        const maxValue = difficultyLevel === 1 ? 19 : difficultyLevel === 2 ? 59 : 99;
        const candidates = [
            this.solution - 1,
            this.solution + 1,
            this.solution - 10,
            this.solution + 10,
            this.tensCount * 10 + ((this.onesCount + 1) % 10),
            Math.max(minValue, (this.tensCount - 1) * 10 + this.onesCount),
            Math.min(maxValue, (this.tensCount + 1) * 10 + this.onesCount)
        ];

        candidates.forEach((value) => {
            if (value !== this.solution && value >= minValue && value <= maxValue) {
                values.add(value);
            }
        });

        while (values.size < count) {
            const randomValue = Phaser.Math.Between(minValue, maxValue);
            if (randomValue !== this.solution) {
                values.add(randomValue);
            }
        }

        return Array.from(values).slice(0, count);
    }

    submitAnswer (value: number)
    {
        if (value === this.solution) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 850);
            this.sfx.get('correct')?.play();
            this.feedbackText.setText('That is the right number.');
            this.time.delayedCall(nextRoundDelay, () => {
                this.generateRound();
            });
            return;
        }

        this.markAdaptiveRoundMistake();
        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(180, 0.002);
        this.time.delayedCall(450, () => {
            this.feedbackText.setText('');
        });
    }

    clearVisuals ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
    }

    clearAnswerCards ()
    {
        this.answerCards.forEach((card) => card.container.destroy());
        this.answerCards = [];
    }

    update () {}

    changeScene () {}
}
