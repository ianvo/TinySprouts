import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type PairChoice = {
    left: number;
    right: number;
    container: Phaser.GameObjects.Container;
};

export class WaysToMakeGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    totalCount: number;
    shownLeft: number;
    shownRight: number;
    choices: PairChoice[];
    visualObjects: Phaser.GameObjects.GameObject[];

    constructor ()
    {
        super('WaysToMakeGameScene', 'Number Combinations');
        this.totalCount = 0;
        this.shownLeft = 0;
        this.shownRight = 0;
        this.choices = [];
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
            this.clearChoices();
            this.clearVisuals();
        });
        EventBus.emit('current-scene-ready', this);
    }

    generateRound ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const isVisualLevel = difficultyLevel === 1;
        this.clearChoices();
        this.clearVisuals();
        this.feedbackText.setText('');

        this.totalCount = difficultyLevel === 1 ? Phaser.Math.Between(4, 6) : difficultyLevel === 2 ? Phaser.Math.Between(6, 10) : Phaser.Math.Between(10, 20);
        this.shownLeft = Phaser.Math.Between(1, this.totalCount - 1);
        this.shownRight = this.totalCount - this.shownLeft;

        if (this.shownLeft > this.shownRight) {
            const temp = this.shownLeft;
            this.shownLeft = this.shownRight;
            this.shownRight = temp;
        }

        this.promptText.setText(isVisualLevel
            ? 'Which pair has the same amount of eggs?'
            : difficultyLevel === 2
                ? `Which pair also makes ${this.totalCount}?`
                : 'Which addition problem has the same total?');
        this.renderTopModel();
        this.buildChoices();
    }

    renderTopModel ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const container = this.add.container(0, -46).setDepth(30);
        const card = this.add.rectangle(0, 0, 210, 112, 0xfff7e3)
            .setStrokeStyle(6, 0x8f5f2e);
        container.add(card);

        if (difficultyLevel < 3) {
            this.addMiniPair(container, this.shownLeft, this.shownRight);
        }
        else {
            const label = this.addGameText(0, 0, `${this.shownLeft} + ${this.shownRight}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 34,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 7,
                align: 'center'
            }).setOrigin(0.5);
            container.add(label);
        }

        this.visualObjects.push(container);
    }

    buildChoices ()
    {
        const correctPair = this.getAlternatePair();
        const distractors = this.getDistractors(correctPair);
        const optionPairs = Phaser.Utils.Array.Shuffle([correctPair, ...distractors]);
        const positions = optionPairs.length === 2 ? [-150, 150] : [-250, 0, 250];

        optionPairs.forEach((pair, index) => {
            const container = this.add.container(positions[index], GameScene.VISUAL_OPTION_Y).setDepth(40);
            const card = this.add.rectangle(0, 0, 210, 112, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ cursor: 'pointer' });
            container.add(card);

            if (this.getDifficultyLevel() < 3) {
                this.addMiniPair(container, pair.left, pair.right);
            }
            else {
                const label = this.addGameText(0, 0, `${pair.left} + ${pair.right}`, {
                    fontFamily: GameScene.FONT_FAMILY,
                    fontSize: 34,
                    color: '#8b4d1d',
                    stroke: '#fff8e5',
                    strokeThickness: 7,
                    align: 'center'
                }).setOrigin(0.5);
                label.disableInteractive();
                container.add(label);
            }

            card.on('pointerup', () => {
                this.submitChoice(pair.left, pair.right);
            });
            card.on('pointerover', () => {
                container.setScale(1.04);
            });
            card.on('pointerout', () => {
                container.setScale(1);
            });

            this.choices.push({ ...pair, container });
        });
    }

    addMiniPair (container: Phaser.GameObjects.Container, left: number, right: number)
    {
        const isVisualLevel = this.getDifficultyLevel() === 1;
        const slotCount = isVisualLevel ? 5 : 10;
        const plus = this.addGameText(0, -4, '+', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 28,
            color: '#8b4d1d',
            stroke: '#fff8e5',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add(plus);

        if (!isVisualLevel) {
            const label = this.addGameText(0, 40, `${left} + ${right}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 22,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6
            }).setOrigin(0.5);
            container.add(label);
        }

        this.addMiniEggs(container, -52, -6, left, slotCount);
        this.addMiniEggs(container, 52, -6, right, slotCount);
    }

    addMiniEggs (container: Phaser.GameObjects.Container, centerX: number, centerY: number, count: number, slotCount: number)
    {
        const columns = 5;
        const horizontalGap = 10;
        const verticalGap = 12;
        const startX = centerX - ((columns - 1) * horizontalGap) / 2;
        const startY = centerY + (slotCount === 5 ? 0 : -6);

        for (let index = 0; index < count; index++) {
            const egg = this.add.ellipse(
                startX + (index % 5) * horizontalGap,
                startY + Math.floor(index / 5) * verticalGap,
                8,
                10,
                GameScene.EGG_FILL
            ).setStrokeStyle(2, 0x8a6230);
            container.add(egg);
        }
    }

    getAlternatePair ()
    {
        let left = Phaser.Math.Between(1, this.totalCount - 1);
        let right = this.totalCount - left;

        while (
            (left === this.shownLeft && right === this.shownRight) ||
            (left === this.shownRight && right === this.shownLeft)
        ) {
            left = Phaser.Math.Between(1, this.totalCount - 1);
            right = this.totalCount - left;
        }

        return left <= right ? { left, right } : { left: right, right: left };
    }

    getDistractors (correctPair: { left: number; right: number })
    {
        const count = this.getDifficultyLevel() === 1 ? 1 : 2;
        const pairs: Array<{ left: number; right: number }> = [];
        const candidates: Array<{ left: number; right: number }> = [];

        for (let total = Math.max(3, this.totalCount - 3); total <= this.totalCount + 3; total++) {
            if (total === this.totalCount) {
                continue;
            }

            for (let left = 1; left < total; left++) {
                const right = total - left;
                const normalized = left <= right ? { left, right } : { left: right, right: left };
                if (normalized.left === correctPair.left && normalized.right === correctPair.right) {
                    continue;
                }
                candidates.push(normalized);
            }
        }

        Phaser.Utils.Array.Shuffle(candidates);
        for (const pair of candidates) {
            if (!pairs.some((entry) => entry.left === pair.left && entry.right === pair.right)) {
                pairs.push(pair);
            }

            if (pairs.length === count) {
                break;
            }
        }

        return pairs;
    }

    createBasket (x: number, y: number, label: string | null, count: number, slotCount: number, showEggs: boolean)
    {
        const width = 178;
        const height = slotCount === 5 ? 96 : 142;
        const panel = this.add.rectangle(x, y, width, height, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        this.visualObjects.push(panel);

        if (label !== null) {
            const labelText = this.addGameText(x, y - height / 2 - 20, label, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 30,
                color: '#7f4c1c',
                stroke: '#fff6df',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(20);
            this.visualObjects.push(labelText);
        }

        if (!showEggs) {
            return;
        }

        const slotWidth = 24;
        const slotHeight = 22;
        const gap = 6;
        const startX = x - 2 * (slotWidth + gap);
        const startY = y + (slotCount === 5 ? 0 : -16);

        for (let index = 0; index < count; index++) {
            const column = index % 5;
            const row = Math.floor(index / 5);
            const egg = this.add.ellipse(
                startX + column * (slotWidth + gap),
                startY + row * 32,
                14,
                18,
                GameScene.EGG_FILL
            ).setStrokeStyle(2, 0x8a6230).setDepth(14);
            this.visualObjects.push(egg);
        }
    }

    submitChoice (left: number, right: number)
    {
        if (left + right === this.totalCount) {
            this.sfx.get('correct')?.play();
            this.feedbackText.setText('That makes the same total.');
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

    clearChoices ()
    {
        this.choices.forEach((choice) => choice.container.destroy());
        this.choices = [];
    }

    clearVisuals ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
    }

    update () {}

    changeScene () {}
}
