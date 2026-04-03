import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { CropName } from '../../crops';
import { GameScene } from '../GameScene';

type GraphCategory = {
    crop: CropName;
    label: string;
    count: number;
};

export class PictureGraphGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    categories: GraphCategory[];
    visualObjects: Phaser.GameObjects.GameObject[];
    answerButtons: Phaser.GameObjects.Container[];
    correctCategory: string;
    correctNumber: number;

    constructor ()
    {
        super('PictureGraphGameScene', 'Picture Graph');
        this.categories = [];
        this.visualObjects = [];
        this.answerButtons = [];
        this.correctCategory = '';
        this.correctNumber = 0;
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

        this.generateRound();
        this.watchDifficultyChanges(() => {
            this.generateRound();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearRound();
        });
        EventBus.emit('current-scene-ready', this);
    }

    generateRound ()
    {
        this.clearRound();
        this.feedbackText.setText('');

        const maxCount = this.getDifficultyLevel() === 1 ? 5 : this.getDifficultyLevel() === 2 ? 6 : 7;
        const counts = Phaser.Utils.Array.Shuffle(
            Array.from({ length: maxCount }, (_, index) => index + 1)
        ).slice(0, 3).sort((a, b) => a - b);
        const labels: Array<{ crop: CropName; label: string }> = [
            { crop: 'tomato', label: 'Tomatoes' },
            { crop: 'corn', label: 'Corn' },
            { crop: 'carrot', label: 'Carrots' }
        ];

        this.categories = labels.map((label, index) => ({
            ...label,
            count: counts[index]
        }));

        this.renderGraph();
        this.buildQuestion();
    }

    renderGraph ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const cropScale = difficultyLevel === 1 ? 0.2 : difficultyLevel === 2 ? 0.2 : 0.18;
        const rowSpacing = difficultyLevel === 1 ? 44 : difficultyLevel === 2 ? 44 : 38;
        const panel = this.add.rectangle(0, 8, 720, 372, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        const title = this.addGameText(0, -158, 'Crop Graph', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        this.visualObjects.push(panel, title);

        const positions = [-220, 0, 220];
        this.categories.forEach((category, index) => {
            const x = positions[index];
            const label = this.addGameText(x, 150, category.label, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 22,
                color: '#7f4c1c',
                stroke: '#fff6df',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5).setDepth(20);
            this.visualObjects.push(label);

            for (let countIndex = 0; countIndex < category.count; countIndex++) {
                const crop = this.addCropSprite(x, 112 - countIndex * rowSpacing, category.crop)
                    .setOrigin(0.5, 0.64)
                    .setScale(cropScale)
                    .setDepth(18);
                this.visualObjects.push(crop);
            }
        });
    }

    buildQuestion ()
    {
        this.clearButtons();
        const difficultyLevel = this.getDifficultyLevel();

        if (difficultyLevel === 1) {
            const asksMost = Phaser.Math.Between(0, 1) === 0;
            const sorted = [...this.categories].sort((a, b) => asksMost ? b.count - a.count : a.count - b.count);
            this.correctCategory = sorted[0].label;
            this.correctNumber = 0;
            this.promptText.setText(`Which crop has the ${asksMost ? 'most' : 'fewest'}?`);
            this.buildCategoryButtons();
            return;
        }

        if (difficultyLevel === 2) {
            const target = Phaser.Utils.Array.GetRandom(this.categories);
            this.correctNumber = target.count;
            this.correctCategory = '';
            this.promptText.setText(`How many ${target.label.toLowerCase()} are there?`);
            this.buildNumberButtons(6);
            return;
        }

        const [first, second] = Phaser.Utils.Array.Shuffle([...this.categories]).slice(0, 2);
        this.correctNumber = Math.abs(first.count - second.count);
        this.correctCategory = '';
        this.promptText.setText(`How many more ${first.label.toLowerCase()} than ${second.label.toLowerCase()}?`);
        this.buildNumberButtons(6);
    }

    buildCategoryButtons ()
    {
        const positions = [-250, 0, 250];
        this.categories.forEach((category, index) => {
            const container = this.add.container(positions[index], GameScene.VISUAL_OPTION_Y).setDepth(40);
            const card = this.add.rectangle(0, 0, 200, 92, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ cursor: 'pointer' });
            const crop = this.addCropSprite(-54, 6, category.crop)
                .setOrigin(0.5, 0.64)
                .setScale(0.14);
            const label = this.addGameText(22, 0, category.label, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 22,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5);
            label.disableInteractive();
            container.add([card, crop, label]);

            card.on('pointerup', () => {
                this.submitCategoryAnswer(category.label);
            });
            card.on('pointerover', () => {
                container.setScale(1.04);
            });
            card.on('pointerout', () => {
                container.setScale(1);
            });

            this.answerButtons.push(container);
        });
    }

    buildNumberButtons (maxValue: number)
    {
        const columns = 6;
        const spacing = 108;
        const startX = -((columns - 1) * spacing) / 2;

        for (let value = 0; value <= maxValue; value++) {
            const x = startX + (value % columns) * spacing;
            const y = GameScene.VISUAL_OPTION_Y + Math.floor(value / columns) * 88;
            const container = this.add.container(x, y).setDepth(40);
            const card = this.add.rectangle(0, 0, 92, 76, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ cursor: 'pointer' });
            const label = this.addGameText(0, 0, `${value}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 28,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 7
            }).setOrigin(0.5);
            label.disableInteractive();
            container.add([card, label]);

            card.on('pointerup', () => {
                this.submitNumberAnswer(value);
            });
            card.on('pointerover', () => {
                container.setScale(1.04);
            });
            card.on('pointerout', () => {
                container.setScale(1);
            });

            this.answerButtons.push(container);
        }
    }

    submitCategoryAnswer (label: string)
    {
        if (label === this.correctCategory) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 850);
            this.sfx.get('correct')?.play();
            this.feedbackText.setText('That matches the graph.');
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

    submitNumberAnswer (value: number)
    {
        if (value === this.correctNumber) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 850);
            this.sfx.get('correct')?.play();
            this.feedbackText.setText('That matches the graph.');
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

    clearButtons ()
    {
        this.answerButtons.forEach((button) => button.destroy());
        this.answerButtons = [];
    }

    clearRound ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
        this.clearButtons();
    }

    update () {}

    changeScene () {}
}
