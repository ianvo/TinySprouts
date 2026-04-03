import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type FenceCard = {
    container: Phaser.GameObjects.Container;
    card: Phaser.GameObjects.Rectangle;
    length: number;
    rank: number;
    orderIndex: number;
    homeX: number;
    homeY: number;
    dragOffsetX: number;
    dragOffsetY: number;
    locked: boolean;
};

export class OrderByLengthGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    visualObjects: Phaser.GameObjects.GameObject[];
    fenceCards: FenceCard[];
    orderPositions: number[];
    rowY: number;
    isRoundComplete: boolean;

    constructor ()
    {
        super('OrderByLengthGameScene', 'Order by Length');
        this.visualObjects = [];
        this.fenceCards = [];
        this.orderPositions = [];
        this.rowY = 86;
        this.isRoundComplete = false;
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
        this.isRoundComplete = false;

        const count = this.getDifficultyLevel() === 1 ? 3 : this.getDifficultyLevel() === 2 ? 4 : 5;
        const lengths = Phaser.Utils.Array.Shuffle([4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, count).sort((a, b) => a - b);
        const shuffledLengths = this.getStartingLengths(lengths);

        this.promptText.setText('Drag the fences into order from shortest to longest.');
        this.renderGuide(count);
        this.renderFenceCards(shuffledLengths);
    }

    getStartingLengths (sortedLengths: number[])
    {
        let shuffled = Phaser.Utils.Array.Shuffle([...sortedLengths]);

        while (shuffled.every((length, index) => length === sortedLengths[index])) {
            shuffled = Phaser.Utils.Array.Shuffle([...sortedLengths]);
        }

        return shuffled;
    }

    renderGuide (count: number)
    {
        this.orderPositions = count === 2
            ? [-180, 180]
            : count === 3
                ? [-250, 0, 250]
                : count === 4
                    ? [-300, -100, 100, 300]
                    : [-340, -170, 0, 170, 340];

        const lane = this.add.rectangle(0, this.rowY, 760, 156, 0xfff5d6, 0.9)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        const guideText = this.addGameText(0, this.rowY - 84, 'Shortest                                    Longest', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        const arrow = this.addGameText(0, this.rowY - 54, 'left to right', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 18,
            color: '#8b5c2d',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        this.visualObjects.push(lane, guideText, arrow);

        this.orderPositions.forEach((x, index) => {
            const slotMarker = this.add.rectangle(x, this.rowY, 172, 116, 0xffffff, 0.001)
                .setStrokeStyle(3, 0xd0b27a, 0.65)
                .setDepth(12);
            const indexLabel = this.addGameText(x, this.rowY + 68, String(index + 1), {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 18,
                color: '#9c6d37',
                stroke: '#fff6df',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(20);
            this.visualObjects.push(slotMarker, indexLabel);
        });
    }

    renderFenceCards (lengths: number[])
    {
        const sortedLengths = [...lengths].sort((a, b) => a - b);

        lengths.forEach((length, index) => {
            const rank = sortedLengths.indexOf(length);
            const homeX = this.orderPositions[index];
            const homeY = this.rowY;
            const container = this.add.container(homeX, homeY).setDepth(40);
            const card = this.add.rectangle(0, 0, 168, 108, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ cursor: 'grab' });
            const label = this.addGameText(0, -34, `Fence ${String.fromCharCode(65 + index)}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 22,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6
            }).setOrigin(0.5);
            label.disableInteractive();

            container.add([card, label]);
            this.addFenceToContainer(container, length);
            this.input.setDraggable(card);

            const fenceCard: FenceCard = {
                container,
                card,
                length,
                rank,
                orderIndex: index,
                homeX,
                homeY,
                dragOffsetX: 0,
                dragOffsetY: 0,
                locked: false
            };

            card.on('dragstart', (pointer: Phaser.Input.Pointer) => {
                if (fenceCard.locked || this.isRoundComplete) {
                    return;
                }
                fenceCard.dragOffsetX = pointer.worldX - container.x;
                fenceCard.dragOffsetY = pointer.worldY - container.y;
                container.setDepth(90);
                container.setScale(1.05);
                card.setStrokeStyle(6, 0x6f9b3a);
                this.feedbackText.setText('Drag left or right to reorder the fences.');
            });

            card.on('drag', (pointer: Phaser.Input.Pointer) => {
                if (fenceCard.locked || this.isRoundComplete) {
                    return;
                }
                container.x = Phaser.Math.Clamp(pointer.worldX - fenceCard.dragOffsetX, -360, 360);
                container.y = this.rowY + Phaser.Math.Clamp(pointer.worldY - fenceCard.dragOffsetY - this.rowY, -18, 18);
                this.reorderAroundDraggedCard(fenceCard);
            });

            card.on('dragend', () => {
                if (fenceCard.locked || this.isRoundComplete) {
                    return;
                }
                this.snapAllCardsToOrder();
                this.time.delayedCall(180, () => {
                    this.evaluateOrder();
                });
            });

            this.fenceCards.push(fenceCard);
        });
    }

    reorderAroundDraggedCard (draggedCard: FenceCard)
    {
        const targetIndex = this.getClosestOrderIndex(draggedCard.container.x);
        if (targetIndex === draggedCard.orderIndex) {
            return;
        }

        const previousIndex = draggedCard.orderIndex;
        this.fenceCards.forEach((card) => {
            if (card === draggedCard) {
                return;
            }

            if (targetIndex > previousIndex && card.orderIndex > previousIndex && card.orderIndex <= targetIndex) {
                card.orderIndex -= 1;
            } else if (targetIndex < previousIndex && card.orderIndex < previousIndex && card.orderIndex >= targetIndex) {
                card.orderIndex += 1;
            }
        });

        draggedCard.orderIndex = targetIndex;

        this.fenceCards.forEach((card) => {
            card.homeX = this.orderPositions[card.orderIndex];
            card.homeY = this.rowY;
            if (card === draggedCard || card.locked) {
                return;
            }
            this.tweens.killTweensOf(card.container);
            this.tweens.add({
                targets: card.container,
                x: card.homeX,
                y: card.homeY,
                duration: 140,
                ease: 'Sine.easeOut'
            });
        });
    }

    getClosestOrderIndex (x: number)
    {
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        this.orderPositions.forEach((position, index) => {
            const distance = Math.abs(x - position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    }

    snapAllCardsToOrder ()
    {
        this.fenceCards.forEach((card) => {
            card.homeX = this.orderPositions[card.orderIndex];
            card.homeY = this.rowY;
            this.tweens.killTweensOf(card.container);
            this.tweens.add({
                targets: card.container,
                x: card.homeX,
                y: card.homeY,
                duration: 170,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    card.container.setDepth(40);
                    card.container.setScale(1);
                    if (!card.locked) {
                        card.card.setStrokeStyle(6, 0x8f5f2e);
                    }
                }
            });
        });
    }

    evaluateOrder ()
    {
        if (this.isRoundComplete) {
            return;
        }

        const inOrder = this.fenceCards.every((card) => card.orderIndex === card.rank);
        if (!inOrder) {
            this.feedbackText.setText('Keep dragging until they go shortest to longest.');
            this.time.delayedCall(500, () => {
                if (!this.isRoundComplete) {
                    this.feedbackText.setText('');
                }
            });
            return;
        }

        this.isRoundComplete = true;
        this.fenceCards.forEach((card) => {
            card.locked = true;
            card.card.disableInteractive();
            card.card.setStrokeStyle(6, 0x6f9b3a);
        });
        const adaptiveResult = this.completeAdaptiveRound();
        const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 900);
        this.sfx.get('correct')?.play();
        this.feedbackText.setText('The fences are in order.');
        this.time.delayedCall(nextRoundDelay, () => {
            this.generateRound();
        });
    }

    addFenceToContainer (container: Phaser.GameObjects.Container, length: number)
    {
        const fenceWidth = 26 + length * 10;
        const topRail = this.add.rectangle(0, -2, fenceWidth, 10, 0xc68848);
        const bottomRail = this.add.rectangle(0, 20, fenceWidth, 10, 0xc68848);
        container.add([topRail, bottomRail]);

        const startX = -fenceWidth / 2;
        for (let index = 0; index < length; index++) {
            const postX = startX + (fenceWidth / Math.max(1, length - 1)) * index;
            const post = this.add.rectangle(postX, 9, 8, 52, 0x98602f);
            container.add(post);
        }
    }

    clearRound ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
        this.fenceCards.forEach((card) => card.container.destroy());
        this.fenceCards = [];
        this.orderPositions = [];
        this.isRoundComplete = false;
    }

    update () {}

    changeScene () {}
}
