import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type ChoiceCard = {
    container: Phaser.GameObjects.Container;
    hitArea: Phaser.GameObjects.Rectangle;
    value: number;
};

export class MakeTenGameScene extends GameScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    titleText: Phaser.GameObjects.Text;
    helperText: Phaser.GameObjects.Text;
    feedbackText: Phaser.GameObjects.Text;
    levelText: Phaser.GameObjects.Text;
    frameBase: Phaser.GameObjects.Rectangle;
    frameSlots: Phaser.GameObjects.Rectangle[];
    frameEggs: Phaser.GameObjects.Ellipse[];
    choiceCards: ChoiceCard[];
    currentLevel: number;
    targetTotal: number;
    prefilledCount: number;
    correctValue: number;
    acceptingInput: boolean;

    constructor ()
    {
        super('MakeTenGameScene', 'Fill the Frame');
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

        this.titleText = this.addGameText(0, -275, 'Fill the Frame', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#ffffff',
            stroke: '#234034',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(20);

        this.helperText = this.addGameText(0, -275, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 36,
            color: '#fffaf0',
            stroke: '#234034',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(20);

        this.feedbackText = this.addGameText(0, 92, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 36,
            color: '#fff6d7',
            stroke: '#234034',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 760 }
        }).setOrigin(0.5).setDepth(20);

        this.levelText = this.addGameText(360, -292, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 22,
            color: '#8c4b24',
            backgroundColor: '#fff0c8',
            padding: { left: 14, right: 14, top: 8, bottom: 8 }
        }).setOrigin(1, 0).setDepth(20);

        this.frameBase = this.add.rectangle(0, -30, 560, 250, 0xffefc6)
            .setStrokeStyle(8, 0x8c5728)
            .setDepth(5);

        this.frameSlots = [];
        this.frameEggs = [];
        this.choiceCards = [];
        this.currentLevel = 1;
        this.targetTotal = 10;
        this.prefilledCount = 0;
        this.correctValue = 0;
        this.acceptingInput = false;

        this.watchDifficultyChanges((difficultyLevel) => {
            this.currentLevel = difficultyLevel;
            this.generateRound();
        });

        this.titleText.setVisible(false);
        this.levelText.setVisible(false);

        this.generateRound();
        EventBus.emit('current-scene-ready', this);
    }

    createFrameSlots (slotCount: number)
    {
        const slotWidth = 90;
        const slotHeight = 88;
        const gap = 12;
        const startX = -2 * (slotWidth + gap);
        const startY = slotCount === 5 ? -48 : -84;

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

    updateFrameLayout ()
    {
        const slotCount = this.getTargetTotal();
        const isFiveFrame = slotCount === 5;
        const baseY = isFiveFrame ? -48 : -30;
        const baseHeight = isFiveFrame ? 132 : 250;
        this.frameSlots.forEach((slot) => slot.destroy());
        this.frameSlots = [];

        this.frameBase
            .setPosition(0, baseY)
            .setSize(560, baseHeight)
            .setDisplaySize(560, baseHeight);

        this.createFrameSlots(slotCount);
    }

    getTargetTotal ()
    {
        return this.currentLevel === 1 ? 5 : 10;
    }

    generateRound ()
    {
        this.clearChoiceCards();
        this.clearFrameEggs();

        this.currentLevel = this.getDifficultyLevel();
        this.targetTotal = this.getTargetTotal();
        this.updateFrameLayout();
        this.prefilledCount = this.getPrefilledCount();
        this.correctValue = this.targetTotal - this.prefilledCount;
        this.acceptingInput = true;

        this.feedbackText.setText('');

        for (let index = 0; index < this.frameSlots.length; index++) {
            const isFilled = index < this.prefilledCount;
            const isEmpty = !isFilled;
            const slot = this.frameSlots[index];

            if (isFilled) {
                slot.setFillStyle(0xfff8df);
            }
            else if (this.currentLevel === 1) {
                slot.setFillStyle(0xffe6a8);
            }
            else if (this.currentLevel === 2) {
                slot.setFillStyle(0xfff5dd);
            }
            else {
                slot.setFillStyle(0xfffaee);
            }

            if (isFilled) {
                this.frameEggs.push(this.addEgg(slot.x, slot.y, 11));
            }
        }

        if (this.currentLevel === 1) {
            this.helperText.setText('Fill the frame to make 5.');
        }
        else if (this.currentLevel === 2) {
            this.helperText.setText('Fill the frame to make 10.');
        }
        else {
            this.helperText.setText('Fill the frame.');
        }

        this.createChoiceCards();
    }

    getPrefilledCount ()
    {
        if (this.currentLevel === 1) {
            return Phaser.Math.Between(1, 4);
        }

        if (this.currentLevel === 2) {
            return Phaser.Math.Between(2, 9);
        }

        return Phaser.Math.Between(1, 9);
    }

    createChoiceCards ()
    {
        const choices = Phaser.Utils.Array.Shuffle([
            this.correctValue,
            ...this.getDistractors(this.correctValue)
        ]);

        const startX = choices.length === 2 ? -110 : -235;

        choices.forEach((value, index) => {
            const x = startX + index * 235;
            const y = 210;
            const container = this.add.container(x, y).setDepth(15);

            const hitArea = this.add.rectangle(0, 0, 200, 120, 0xffffff, 0.001)
                .setOrigin(0.5, 0.5)
                .setInteractive({ cursor: 'grab' });
            const card = this.add.rectangle(0, 0, 200, 120, 0xfff6d6)
                .setStrokeStyle(5, 0x966131);
            const showEggs = this.currentLevel < 3;
            const badge = this.add.circle(showEggs ? 70 : 0, showEggs ? -36 : 0, showEggs ? 24 : 0, 0xfffcf2)
                .setStrokeStyle(showEggs ? 4 : 0, 0x966131)
                .setVisible(showEggs);
            const label = this.add.text(showEggs ? 70 : 0, showEggs ? -36 : 0, `${value}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: showEggs ? 56 : 84,
                color: '#8f4f24',
                stroke: '#fffaf0',
                strokeThickness: 10
            }).setOrigin(0.5).setResolution(2).setScale(0.5);

            container.add(hitArea);
            container.add(card);
            if (showEggs) {
                this.addChoiceEggs(container, value);
            }
            container.add(badge);
            container.add(label);

            container.setSize(200, 120);
            hitArea.on('pointerup', () => {
                if (!this.acceptingInput) {
                    return;
                }

                const choice = this.choiceCards.find((entry) => entry.hitArea === hitArea);
                if (!choice) {
                    return;
                }

                if (choice.value === this.correctValue) {
                    this.handleCorrectChoice(choice);
                }
                else {
                    this.handleIncorrectChoice(choice);
                }
            });

            this.choiceCards.push({
                container,
                hitArea,
                value
            });
        });
    }

    addChoiceEggs (container: Phaser.GameObjects.Container, count: number)
    {
        const columns = Math.min(5, count);
        const rows = Math.ceil(count / 5);
        const horizontalGap = 24;
        const verticalGap = 30;
        const startX = -8 - ((columns - 1) * horizontalGap) / 2;
        const startY = rows === 1 ? 12 : -2;

        for (let index = 0; index < count; index++) {
            const column = index % 5;
            const row = Math.floor(index / 5);
            const egg = this.add.ellipse(
                startX + column * horizontalGap,
                startY + row * verticalGap,
                18,
                24,
                GameScene.EGG_FILL
            ).setStrokeStyle(3, 0x9d7846);

            container.add(egg);
        }
    }

    getDistractors (correctValue: number)
    {
        const distractors: number[] = [];
        const candidates = Phaser.Utils.Array.Shuffle(
            Array.from({ length: this.targetTotal - 1 }, (_value, index) => index + 1)
                .filter((value) => value !== correctValue)
        );

        for (const value of candidates) {
            distractors.push(value);

            if ((this.currentLevel === 1 && distractors.length === 1) || distractors.length === 2) {
                break;
            }
        }

        return distractors;
    }

    addEgg (x: number, y: number, depth: number)
    {
        return this.add.ellipse(x, y, 36, 48, GameScene.EGG_FILL)
            .setStrokeStyle(4, 0x9d7846)
            .setDepth(depth);
    }

    handleCorrectChoice (choice: ChoiceCard)
    {
        this.acceptingInput = false;
        choice.hitArea.disableInteractive();

        this.sfx.get('correct')?.play();

        this.tweens.add({
            targets: choice.container,
            x: 0,
            y: 110,
            scaleX: 0.4,
            scaleY: 0.4,
            alpha: 0,
            duration: 260,
            ease: 'Back.easeIn'
        });

        this.fillRemainingSlots();
        this.feedbackText.setText(`That makes ${this.targetTotal}.`);

        this.frameSlots.forEach((slot) => {
            slot.setFillStyle(0xd6f4a4);
        });

        this.time.delayedCall(1200, () => {
            this.generateRound();
        });
    }

    handleIncorrectChoice (choice: ChoiceCard)
    {
        this.sfx.get('incorrect')?.play();
        this.feedbackText.setText('Try again.');
        this.cameras.main.shake(120, 0.0015);
    }

    fillRemainingSlots ()
    {
        for (let index = this.prefilledCount; index < this.targetTotal; index++) {
            const slot = this.frameSlots[index];
            this.frameEggs.push(this.addEgg(slot.x, slot.y, 11));
        }
    }

    clearFrameEggs ()
    {
        this.frameEggs.forEach((egg) => egg.destroy());
        this.frameEggs = [];
    }

    clearChoiceCards ()
    {
        this.choiceCards.forEach((choice) => choice.container.destroy());
        this.choiceCards = [];
    }

    changeScene ()
    {
    }
}
