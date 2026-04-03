import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type CompareChoice = 'Left' | 'Right' | 'Same';

type AnswerButton = {
    choice: CompareChoice;
    container: Phaser.GameObjects.Container;
};

export class CompareCoopsGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    leftCount: number;
    rightCount: number;
    correctChoice: CompareChoice;
    answerButtons: AnswerButton[];
    visualObjects: Phaser.GameObjects.GameObject[];

    constructor ()
    {
        super('CompareCoopsGameScene', 'Comparing Quantities');
        this.leftCount = 0;
        this.rightCount = 0;
        this.correctChoice = 'Left';
        this.answerButtons = [];
        this.visualObjects = [];
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.useFixedStageCamera(this.camera);
        this.camera.setBackgroundColor('rgba(0,0,0,0)');

        this.bgm.set('gameplay', new Howl({
            src: ['assets/bgm/Theme_3_PlayfulTime_Loop.ogg'],
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

        this.promptText = this.addGameText(0, -290, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 50,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.feedbackText = this.addGameText(0, -198, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#fff7df',
            stroke: '#2d3d24',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.buildAnswerButtons();
        this.generateRound();
        this.watchDifficultyChanges(() => {
            this.buildAnswerButtons();
            this.generateRound();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearVisuals();
            this.clearAnswerButtons();
        });
        EventBus.emit('current-scene-ready', this);
    }

    buildAnswerButtons ()
    {
        this.clearAnswerButtons();

        const choices: CompareChoice[] = this.getDifficultyLevel() === 1
            ? ['Left', 'Right']
            : ['Left', 'Same', 'Right'];
        const positions = choices.length === 2 ? [-150, 150] : [-250, 0, 250];

        choices.forEach((choice, index) => {
            const container = this.add.container(positions[index], GameScene.VISUAL_OPTION_Y).setDepth(40);
            const card = this.add.rectangle(0, 0, 200, 92, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ cursor: 'pointer' });
            const label = this.addGameText(0, 0, choice, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 34,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 7,
                align: 'center'
            }).setOrigin(0.5);
            label.disableInteractive();

            container.add([card, label]);

            card.on('pointerup', () => {
                this.submitAnswer(choice);
            });
            card.on('pointerover', () => {
                container.setScale(1.04);
            });
            card.on('pointerout', () => {
                container.setScale(1);
            });

            this.answerButtons.push({ choice, container });
        });
    }

    generateRound ()
    {
        this.buildAnswerButtons();
        const difficultyLevel = this.getDifficultyLevel();
        const allowSame = difficultyLevel > 1 && Phaser.Math.Between(0, 3) === 0;
        const maxValue = difficultyLevel === 1 ? 5 : 10;
        const minValue = difficultyLevel === 1 ? 1 : difficultyLevel === 2 ? 2 : 3;

        this.leftCount = Phaser.Math.Between(minValue, maxValue);

        if (allowSame) {
            this.rightCount = this.leftCount;
        }
        else {
            do {
                this.rightCount = Phaser.Math.Between(minValue, maxValue);
            } while (this.rightCount === this.leftCount);
        }

        this.correctChoice = this.leftCount === this.rightCount
            ? 'Same'
            : this.leftCount > this.rightCount ? 'Left' : 'Right';

        this.promptText.setText(difficultyLevel === 1
            ? 'Which coop has more eggs?'
            : 'Which coop has more eggs, or are they the same?');
        this.feedbackText.setText('');
        this.renderVisuals();
    }

    renderVisuals ()
    {
        this.clearVisuals();
        const difficultyLevel = this.getDifficultyLevel();

        if (difficultyLevel === 1) {
            const framePlan = [5];
            this.createFrameGroup(-220, -30, this.leftCount, 'Left coop', framePlan);
            this.createFrameGroup(220, -30, this.rightCount, 'Right coop', framePlan);
            return;
        }

        if (difficultyLevel === 2) {
            const sharedRows = Math.ceil(Math.max(this.leftCount, this.rightCount) / 5);
            this.createOrderlyGroup(-220, -20, this.leftCount, 'Left coop', sharedRows);
            this.createOrderlyGroup(220, -20, this.rightCount, 'Right coop', sharedRows);
            return;
        }

        this.createScatteredGroup(-220, -10, this.leftCount, 'Left coop');
        this.createScatteredGroup(220, -10, this.rightCount, 'Right coop');
    }

    createFrameGroup (x: number, y: number, count: number, label: string, framePlan: number[])
    {
        const labelY = framePlan.length === 1 ? y - 96 : y - 132;
        const startY = y - ((framePlan.length - 1) * 60);

        const labelText = this.addGameText(x, labelY, label, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        this.visualObjects.push(labelText);

        let remainingCount = count;
        framePlan.forEach((slotCount, index) => {
            const filledCount = Math.max(0, Math.min(slotCount, remainingCount));
            this.createEggFrame(x, startY + index * 120, filledCount, slotCount);
            remainingCount -= filledCount;
        });
    }

    createEggFrame (x: number, y: number, filledCount: number, slotCount: number)
    {
        const width = 250;
        const height = slotCount === 5 ? 110 : 160;
        const panel = this.add.rectangle(x, y, width, height, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
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
            ).setStrokeStyle(3, 0x8f6935).setDepth(12);
            this.visualObjects.push(slot);

            if (index < filledCount) {
                const egg = this.add.ellipse(slot.x, slot.y, 20, 28, GameScene.EGG_FILL)
                    .setStrokeStyle(3, 0x8a6230)
                    .setDepth(14);
                this.visualObjects.push(egg);
            }
        }
    }

    createOrderlyGroup (x: number, y: number, count: number, label: string, rows: number)
    {
        const width = 250;
        const height = 84 + Math.max(1, rows) * 42;
        const labelText = this.addGameText(x, y - height / 2 - 24, label, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        const panel = this.add.rectangle(x, y, width, height, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);

        this.visualObjects.push(labelText, panel);

        const columns = 5;
        const horizontalGap = 34;
        const verticalGap = 38;
        const startX = x - ((columns - 1) * horizontalGap) / 2;
        const startY = y - ((Math.max(1, rows) - 1) * verticalGap) / 2;

        for (let index = 0; index < count; index++) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const egg = this.add.ellipse(
                startX + column * horizontalGap,
                startY + row * verticalGap,
                20,
                28,
                GameScene.EGG_FILL
            ).setStrokeStyle(3, 0x8a6230).setDepth(14);
            this.visualObjects.push(egg);
        }
    }

    createScatteredGroup (x: number, y: number, count: number, label: string)
    {
        const width = 250;
        const height = count > 12 ? 220 : 180;
        const labelText = this.addGameText(x, y - height / 2 - 24, label, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        const panel = this.add.rectangle(x, y, width, height, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);

        this.visualObjects.push(labelText, panel);

        const positions: Array<{ x: number; y: number }> = [];
        const minDistance = 22;
        const left = x - width / 2 + 26;
        const right = x + width / 2 - 26;
        const top = y - height / 2 + 24;
        const bottom = y + height / 2 - 24;

        for (let index = 0; index < count; index++) {
            let eggX = x;
            let eggY = y;

            for (let attempt = 0; attempt < 60; attempt++) {
                const candidateX = Phaser.Math.Between(left, right);
                const candidateY = Phaser.Math.Between(top, bottom);
                const overlaps = positions.some((position) =>
                    Phaser.Math.Distance.Between(candidateX, candidateY, position.x, position.y) < minDistance
                );

                if (!overlaps) {
                    eggX = candidateX;
                    eggY = candidateY;
                    break;
                }
            }

            positions.push({ x: eggX, y: eggY });
            const egg = this.add.ellipse(eggX, eggY, 20, 28, GameScene.EGG_FILL)
                .setStrokeStyle(3, 0x8a6230)
                .setDepth(14);
            this.visualObjects.push(egg);
        }
    }

    submitAnswer (choice: CompareChoice)
    {
        if (choice === this.correctChoice) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 800);
            this.sfx.get('correct')?.play();
            this.feedbackText.setText(choice === 'Same' ? 'They match.' : `${choice} has more.`);
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

    clearAnswerButtons ()
    {
        this.answerButtons.forEach((button) => button.container.destroy());
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
