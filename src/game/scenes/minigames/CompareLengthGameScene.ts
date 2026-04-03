import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type LengthChoice = 'Left' | 'Middle' | 'Right' | 'Same';

type LengthButton = {
    choice: LengthChoice;
    container: Phaser.GameObjects.Container;
};

export class CompareLengthGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    leftLength: number;
    middleLength: number;
    rightLength: number;
    correctChoice: LengthChoice;
    buttons: LengthButton[];
    visualObjects: Phaser.GameObjects.GameObject[];

    constructor ()
    {
        super('CompareLengthGameScene', 'Compare Length');
        this.leftLength = 0;
        this.middleLength = 0;
        this.rightLength = 0;
        this.correctChoice = 'Left';
        this.buttons = [];
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

        this.promptText = this.addGameText(0, -286, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 50,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(100);

        this.feedbackText = this.addGameText(0, -196, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#fff7df',
            stroke: '#2d3d24',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(100);

        this.buildButtons();
        this.generateRound();
        this.watchDifficultyChanges(() => {
            this.buildButtons();
            this.generateRound();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearRound();
            this.clearButtons();
        });
        EventBus.emit('current-scene-ready', this);
    }

    buildButtons ()
    {
        this.clearButtons();
        const difficultyLevel = this.getDifficultyLevel();
        const choices: LengthChoice[] = difficultyLevel === 1
            ? ['Left', 'Right']
            : difficultyLevel === 2
                ? ['Left', 'Same', 'Right']
                : ['Left', 'Middle', 'Right'];
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

            this.buttons.push({ choice, container });
        });
    }

    generateRound ()
    {
        this.buildButtons();
        this.clearRound();
        this.feedbackText.setText('');

        const difficultyLevel = this.getDifficultyLevel();
        this.middleLength = 0;

        if (difficultyLevel === 3) {
            const candidates = Phaser.Utils.Array.Shuffle([6, 7, 8, 9, 10, 11, 12, 13, 14]);
            const lengths = candidates.slice(0, 3);
            this.leftLength = lengths[0];
            this.middleLength = lengths[1];
            this.rightLength = lengths[2];
            const longest = Math.max(this.leftLength, this.middleLength, this.rightLength);
            this.correctChoice = longest === this.leftLength
                ? 'Left'
                : longest === this.middleLength ? 'Middle' : 'Right';
            this.promptText.setText('Which fence is longest?');
            this.renderRound();
            return;
        }

        const allowSame = difficultyLevel === 2 && Phaser.Math.Between(0, 3) === 0;
        const minLength = difficultyLevel === 1 ? 3 : 4;
        const maxLength = difficultyLevel === 1 ? 8 : 10;
        const minDifference = difficultyLevel === 1 ? 2 : 1;

        this.leftLength = Phaser.Math.Between(minLength, maxLength);

        if (allowSame) {
            this.rightLength = this.leftLength;
        }
        else {
            do {
                this.rightLength = Phaser.Math.Between(minLength, maxLength);
            } while (Math.abs(this.rightLength - this.leftLength) < minDifference || this.rightLength === this.leftLength);
        }

        this.correctChoice = this.leftLength === this.rightLength
            ? 'Same'
            : this.leftLength > this.rightLength ? 'Left' : 'Right';

        this.promptText.setText(difficultyLevel === 1
            ? 'Which fence is longer?'
            : 'Which fence is longer, or are they the same?');
        this.renderRound();
    }

    renderRound ()
    {
        if (this.getDifficultyLevel() === 3) {
            this.createFencePanel(-260, -26, this.leftLength, 'Left fence', 220);
            this.createFencePanel(0, -26, this.middleLength, 'Middle fence', 220);
            this.createFencePanel(260, -26, this.rightLength, 'Right fence', 220);
            return;
        }

        this.createFencePanel(-220, -26, this.leftLength, 'Left fence');
        this.createFencePanel(220, -26, this.rightLength, 'Right fence');
    }

    createFencePanel (x: number, y: number, lengthUnits: number, label: string, panelWidth = 280)
    {
        const panel = this.add.rectangle(x, y, panelWidth, 210, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        const labelText = this.addGameText(x, y - 120, label, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        this.visualObjects.push(panel, labelText);

        const fenceWidth = 40 + lengthUnits * 14;
        const topRail = this.add.rectangle(x, y - 18, fenceWidth, 12, 0xc68848).setDepth(14);
        const bottomRail = this.add.rectangle(x, y + 18, fenceWidth, 12, 0xc68848).setDepth(14);
        this.visualObjects.push(topRail, bottomRail);

        const postCount = Math.max(2, lengthUnits);
        const startX = x - fenceWidth / 2;
        for (let index = 0; index < postCount; index++) {
            const postX = startX + (fenceWidth / Math.max(1, postCount - 1)) * index;
            const post = this.add.rectangle(postX, y, 10, 70, 0x98602f).setDepth(13);
            this.visualObjects.push(post);
        }
    }

    submitAnswer (choice: LengthChoice)
    {
        if (choice === this.correctChoice) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 850);
            this.sfx.get('correct')?.play();
            this.feedbackText.setText(choice === 'Same' ? 'They are the same length.' : `${choice} is longer.`);
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

    clearRound ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
    }

    clearButtons ()
    {
        this.buttons.forEach((button) => button.container.destroy());
        this.buttons = [];
    }

    update () {}

    changeScene () {}
}
