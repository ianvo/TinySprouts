import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { CropName, CROP_SPRITESHEET_KEY } from '../../crops';
import { GameScene } from '../GameScene';

type Side = 'left' | 'right';

type CropValueDefinition = {
    crop: CropName;
    label: string;
    value: number;
    color: number;
};

type BalanceRound = {
    prompt: string;
    helper: string;
    equationHint: string;
    leftBaseCrops: CropName[];
    rightBaseCrops: CropName[];
    allowedCrops: CropName[];
    allowLeftPlacement: boolean;
    allowRightPlacement: boolean;
    removableSide: Side | null;
    showValues: boolean;
};

type TrayVisuals = {
    container: Phaser.GameObjects.Container;
    tray: Phaser.GameObjects.Rectangle;
    dropGlow: Phaser.GameObjects.Rectangle;
    content: Phaser.GameObjects.Container;
};

type BinCard = {
    crop: CropName;
    container: Phaser.GameObjects.Container;
    homeX: number;
    homeY: number;
    dragOffsetX: number;
    dragOffsetY: number;
};

const CROP_VALUES: CropValueDefinition[] = [
    { crop: 'carrot', label: 'Carrot', value: 1, color: 0xf59c52 },
    { crop: 'corn', label: 'Corn', value: 2, color: 0xf2cd4f },
    { crop: 'tomato', label: 'Tomato', value: 3, color: 0xe2695b },
    { crop: 'cabbage', label: 'Cabbage', value: 4, color: 0x8bca78 },
    { crop: 'pumpkin', label: 'Pumpkin', value: 5, color: 0xffa45d }
];

const CROP_VALUE_BY_NAME: Record<CropName, CropValueDefinition> = Object.fromEntries(
    CROP_VALUES.map((definition) => [definition.crop, definition])
) as Record<CropName, CropValueDefinition>;

export class BalanceEquationGameScene extends GameScene
{
    static readonly LEFT_TRAY_X = -244;
    static readonly RIGHT_TRAY_X = 244;
    static readonly TRAY_Y = 104;
    static readonly TRAY_WIDTH = 244;
    static readonly TRAY_HEIGHT = 132;
    static readonly MAX_PLACED_CROPS_PER_SIDE = 8;

    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    beamContainer!: Phaser.GameObjects.Container;
    leftTrayVisuals!: TrayVisuals;
    rightTrayVisuals!: TrayVisuals;
    binCards: BinCard[];
    round: BalanceRound | null;
    leftPlacedCrops: CropName[];
    rightPlacedCrops: CropName[];
    acceptingInput: boolean;
    activeDraggedCard: BinCard | null;
    activePointerId: number | null;

    constructor (sceneKey = 'BalanceEquationGameScene', sceneTitle = 'Balance Equations')
    {
        super(sceneKey, sceneTitle);
        this.binCards = [];
        this.round = null;
        this.leftPlacedCrops = [];
        this.rightPlacedCrops = [];
        this.acceptingInput = true;
        this.activeDraggedCard = null;
        this.activePointerId = null;
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.useFixedStageCamera(this.camera);
        this.camera.setBackgroundColor('rgba(0,0,0,0)');
        this.input.dragDistanceThreshold = 2;
        this.input.dragTimeThreshold = 0;
        this.textures.get(CROP_SPRITESHEET_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);

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

        this.promptText = this.addGameText(0, -292, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 50,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 860 }
        }).setOrigin(0.5).setDepth(120);

        this.feedbackText = this.addGameText(0, 178, '', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 30,
            color: '#fff7de',
            stroke: '#304225',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 780 }
        }).setOrigin(0.5).setDepth(120);

        this.createBalance();
        this.generateRound();
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.watchDifficultyChanges(() => {
            this.generateRound();
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.textures.get(CROP_SPRITESHEET_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
            this.clearRoundObjects();
        });
        EventBus.emit('current-scene-ready', this);
    }

    createBalance ()
    {
        const support = this.add.graphics().setDepth(20);
        support.fillStyle(0xe8c788, 1);
        support.lineStyle(8, 0x8f6235, 1);
        support.beginPath();
        support.moveTo(0, 22);
        support.lineTo(118, 180);
        support.lineTo(-118, 180);
        support.closePath();
        support.fillPath();
        support.strokePath();

        this.add.rectangle(0, 194, 156, 26, 0x8f6235)
            .setDepth(18);
        this.add.circle(0, -2, 18, 0xf3ddb2)
            .setStrokeStyle(6, 0x8f6235)
            .setDepth(42);

        this.beamContainer = this.add.container(0, -2).setDepth(40);
        const beam = this.add.rectangle(0, 0, 612, 20, 0xb37b43)
            .setStrokeStyle(6, 0x7e532c);

        this.leftTrayVisuals = this.createTrayVisuals(BalanceEquationGameScene.LEFT_TRAY_X);
        this.rightTrayVisuals = this.createTrayVisuals(BalanceEquationGameScene.RIGHT_TRAY_X);

        this.beamContainer.add([
            beam,
            this.leftTrayVisuals.container,
            this.rightTrayVisuals.container
        ]);
    }

    createTrayVisuals (x: number): TrayVisuals
    {
        const container = this.add.container(x, 0);
        const leftHanger = this.add.rectangle(-72, 38, 6, 74, 0xb37b43)
            .setStrokeStyle(2, 0x7e532c);
        const rightHanger = this.add.rectangle(72, 38, 6, 74, 0xb37b43)
            .setStrokeStyle(2, 0x7e532c);
        const trayShadow = this.add.rectangle(0, BalanceEquationGameScene.TRAY_Y + 8, BalanceEquationGameScene.TRAY_WIDTH + 6, BalanceEquationGameScene.TRAY_HEIGHT, 0x000000, 0.12);
        const tray = this.add.rectangle(0, BalanceEquationGameScene.TRAY_Y, BalanceEquationGameScene.TRAY_WIDTH, BalanceEquationGameScene.TRAY_HEIGHT, 0xfff5d6)
            .setStrokeStyle(6, 0x8f5f2e);
        const trayInner = this.add.rectangle(0, BalanceEquationGameScene.TRAY_Y, BalanceEquationGameScene.TRAY_WIDTH - 18, BalanceEquationGameScene.TRAY_HEIGHT - 18, 0xfffbef)
            .setStrokeStyle(3, 0xe7d4ab);
        const trayLip = this.add.rectangle(0, BalanceEquationGameScene.TRAY_Y + BalanceEquationGameScene.TRAY_HEIGHT / 2 - 14, BalanceEquationGameScene.TRAY_WIDTH, 18, 0xe7c58d)
            .setStrokeStyle(3, 0x8f5f2e);
        const dropGlow = this.add.rectangle(0, BalanceEquationGameScene.TRAY_Y, BalanceEquationGameScene.TRAY_WIDTH - 10, BalanceEquationGameScene.TRAY_HEIGHT - 10, 0xffe8a8, 0.18)
            .setStrokeStyle(4, 0xf4b74c, 0.28)
            .setVisible(false);
        const content = this.add.container(0, BalanceEquationGameScene.TRAY_Y - 22);

        container.add([leftHanger, rightHanger, trayShadow, dropGlow, tray, trayInner, trayLip, content]);

        return {
            container,
            tray,
            dropGlow,
            content
        };
    }

    generateRound ()
    {
        this.round = this.buildRound();
        this.leftPlacedCrops = [];
        this.rightPlacedCrops = [];
        this.acceptingInput = true;

        this.promptText.setText(this.round.prompt);
        this.feedbackText.setText('');

        this.buildCropBin();
        this.renderTrayContents();
        this.updateBalanceState();
    }

    buildRound (): BalanceRound
    {
        const difficultyLevel = this.getDifficultyLevel();

        if (difficultyLevel === 1) {
            return this.buildLevelOneRound();
        }

        if (difficultyLevel === 2) {
            return this.buildLevelTwoRound();
        }

        return this.buildLevelThreeRound();
    }

    buildLevelOneRound (): BalanceRound
    {
        const levelPool = this.getLevelCropPool(1);
        const allowedCrop = Phaser.Utils.Array.GetRandom(levelPool);
        const rightCount = Phaser.Math.Between(1, 3);
        const piecesNeeded = Phaser.Math.Between(1, 3);
        const leftCount = rightCount + piecesNeeded;
        const leftBaseCrops = Array.from({ length: leftCount }, () => allowedCrop);
        const rightBaseCrops = Array.from({ length: rightCount }, () => allowedCrop);
        const cropLabel = this.getCropLabel(allowedCrop);

        return {
            prompt: `Add ${cropLabel}${piecesNeeded === 1 ? '' : 's'} until both trays match.`,
            helper: 'Drag the same crop onto the right tray until the scale is level.',
            equationHint: '',
            leftBaseCrops,
            rightBaseCrops,
            allowedCrops: [allowedCrop],
            allowLeftPlacement: false,
            allowRightPlacement: true,
            removableSide: null,
            showValues: false
        } satisfies BalanceRound;
    }

    buildLevelTwoRound (): BalanceRound
    {
        const levelPool = this.getLevelCropPool(1);
        const crop = Phaser.Utils.Array.GetRandom(levelPool);
        const smallerCount = Phaser.Math.Between(1, 3);
        const piecesToRemove = Phaser.Math.Between(1, 3);
        const largerCount = smallerCount + piecesToRemove;
        const heavierSide: Side = Phaser.Math.Between(0, 1) === 0 ? 'left' : 'right';
        const leftBaseCrops = Array.from(
            { length: heavierSide === 'left' ? largerCount : smallerCount },
            () => crop
        );
        const rightBaseCrops = Array.from(
            { length: heavierSide === 'right' ? largerCount : smallerCount },
            () => crop
        );
        const cropLabel = this.getCropLabel(crop);

        return {
            prompt: `Take ${cropLabel}${piecesToRemove === 1 ? '' : 's'} off the ${heavierSide} tray until both trays match.`,
            helper: `Tap ${cropLabel}${piecesToRemove === 1 ? '' : 's'} off the heavier tray until the scale is level.`,
            equationHint: '',
            leftBaseCrops,
            rightBaseCrops,
            allowedCrops: [],
            allowLeftPlacement: false,
            allowRightPlacement: false,
            removableSide: heavierSide,
            showValues: false
        } satisfies BalanceRound;
    }

    buildLevelThreeRound (): BalanceRound
    {
        const roundCropPool: CropName[] = ['carrot', 'corn'];
        const solutionCrops = this.findRandomCombination(
            Phaser.Math.Between(4, 10),
            roundCropPool,
            2,
            4
        ) ?? [roundCropPool[0], roundCropPool[1]];
        const difference = this.getCropTotal(solutionCrops);
        const lighterTotal = Phaser.Math.Between(4, 10);
        const heavierTotal = lighterTotal + difference;
        const leftHeavier = Phaser.Math.Between(0, 1) === 0;
        const leftTotal = leftHeavier ? heavierTotal : lighterTotal;
        const rightTotal = leftHeavier ? lighterTotal : heavierTotal;
        const leftBaseCrops = this.findRandomCombination(leftTotal, roundCropPool, 2, 6) ?? [roundCropPool[0], roundCropPool[1]];
        const rightBaseCrops = this.findRandomCombination(rightTotal, roundCropPool, 2, 6) ?? [roundCropPool[0]];

        return {
            prompt: 'Use the crop bin on either tray until both sides are equal.',
            helper: 'You can add crops to the left tray, the right tray, or both.',
            equationHint: `${leftTotal} + ? = ${rightTotal} + ?`,
            leftBaseCrops,
            rightBaseCrops,
            allowedCrops: roundCropPool,
            allowLeftPlacement: true,
            allowRightPlacement: true,
            removableSide: null,
            showValues: true
        } satisfies BalanceRound;
    }

    getLevelCropPool (difficultyLevel: number) {
        if (difficultyLevel === 1) {
            return ['carrot', 'corn', 'tomato'] as CropName[];
        }

        if (difficultyLevel === 2) {
            return ['carrot', 'corn', 'tomato', 'cabbage'] as CropName[];
        }

        return ['carrot', 'corn', 'tomato', 'cabbage', 'pumpkin'] as CropName[];
    }

    findRandomCombination (target: number, cropPool: CropName[], minPieces: number, maxPieces: number) {
        const shuffledPool = Phaser.Utils.Array.Shuffle([...cropPool]);

        for (let pieceCount = minPieces; pieceCount <= maxPieces; pieceCount += 1) {
            const result = this.searchCombination(target, shuffledPool, pieceCount, []);
            if (result) {
                return Phaser.Utils.Array.Shuffle(result);
            }
        }

        return null;
    }

    searchCombination (target: number, cropPool: CropName[], piecesRemaining: number, current: CropName[]): CropName[] | null
    {
        if (piecesRemaining === 0) {
            return target === 0 ? [...current] : null;
        }

        for (const crop of cropPool) {
            const value = this.getCropValue(crop);
            if (value > target) {
                continue;
            }

            current.push(crop);
            const result = this.searchCombination(target - value, cropPool, piecesRemaining - 1, current);
            current.pop();

            if (result) {
                return result;
            }
        }

        return null;
    }

    buildCropBin ()
    {
        this.binCards.forEach((card) => card.container.destroy());
        this.binCards = [];
        this.activeDraggedCard = null;
        this.activePointerId = null;
        this.updateTrayHighlights(null);

        if (!this.round) {
            return;
        }

        const round = this.round;
        const positions = this.getBinPositions(round.allowedCrops.length);

        round.allowedCrops.forEach((crop, index) => {
            const x = positions[index];
            const y = 294;
            const definition = CROP_VALUE_BY_NAME[crop];
            const showValues = round.showValues;
            const container = this.add.container(x, y).setDepth(130);
            const hitArea = this.add.rectangle(0, 0, 118, 110, 0xffffff, 0.001);
            const card = this.add.rectangle(0, 0, 118, 110, 0xfff7df)
                .setStrokeStyle(6, 0x8f5f2e);
            const cropChip = this.createCropChip(crop, false, 0.38, 1.08, false, showValues);
            cropChip.setPosition(0, -10);
            const label = this.addGameText(0, 38, showValues ? `${definition.label}\n${definition.value}` : definition.label, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 18,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 5,
                align: 'center'
            }).setOrigin(0.5);

            container.add([card, cropChip, label, hitArea]);
            container.setData('hitArea', hitArea);
            hitArea.setInteractive({ cursor: 'grab' });

            hitArea.on('pointerover', () => {
                if (this.acceptingInput) {
                    container.setScale(1.04);
                }
            });
            hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (!this.acceptingInput) {
                    return;
                }

                const binCard = this.getBinCardForObject(container);
                if (!binCard) {
                    return;
                }

                this.tweens.killTweensOf(container);
                this.activeDraggedCard = binCard;
                this.activePointerId = pointer.id;
                binCard.dragOffsetX = pointer.worldX - container.x;
                binCard.dragOffsetY = pointer.worldY - container.y;
                container.setData('didDrag', false);
                container.setData('isPointerDown', true);
                container.setData('isDragging', false);
                container.setDepth(160);
                container.setScale(1.06);
                if (hitArea.input) {
                    hitArea.input.cursor = 'grabbing';
                }
            });
            hitArea.on('pointerout', () => {
                if (!container.getData('isDragging') && !container.getData('isPointerDown')) {
                    container.setScale(1);
                }
            });

            this.binCards.push({
                crop,
                container,
                homeX: x,
                homeY: y,
                dragOffsetX: 0,
                dragOffsetY: 0
            });

            if (hitArea.input) {
                hitArea.input.cursor = 'grab';
            }
        });
    }

    getBinPositions (count: number) {
        if (count === 1) {
            return [0];
        }

        if (count === 2) {
            return [-120, 120];
        }

        return [-190, 0, 190];
    }

    getBinCardForObject (gameObject: Phaser.GameObjects.GameObject) {
        return this.binCards.find((card) => card.container === gameObject) ?? null;
    }

    handlePointerMove (pointer: Phaser.Input.Pointer)
    {
        if (!this.acceptingInput || !this.activeDraggedCard || this.activePointerId !== pointer.id) {
            return;
        }

        const { container, dragOffsetX, dragOffsetY } = this.activeDraggedCard;
        const dragDistance = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);

        if (!container.getData('didDrag') && dragDistance < 4) {
            return;
        }

        container.setData('didDrag', true);
        container.setData('isDragging', true);
        container.setData('isPointerDown', false);
        container.setScale(1.08);
        container.setDepth(160);
        container.x = pointer.worldX - dragOffsetX;
        container.y = pointer.worldY - dragOffsetY;
        this.updateTrayHighlights(this.getDropTargetForPoint(container.x, container.y));
    }

    handlePointerUp (pointer: Phaser.Input.Pointer)
    {
        if (!this.activeDraggedCard || this.activePointerId !== pointer.id) {
            return;
        }

        const binCard = this.activeDraggedCard;
        const { container } = binCard;
        this.activeDraggedCard = null;
        this.activePointerId = null;
        container.setData('isDragging', false);
        container.setData('isPointerDown', false);

        if (container.getData('didDrag')) {
            const targetSide = this.acceptingInput
                ? this.getDropTargetForPoint(container.x, container.y)
                : null;

            if (targetSide) {
                this.placeCrop(targetSide, binCard.crop);
            }
        }

        this.updateTrayHighlights(null);
        this.tweens.killTweensOf(container);
        this.tweens.add({
            targets: container,
            x: binCard.homeX,
            y: binCard.homeY,
            scaleX: 1,
            scaleY: 1,
            duration: 120,
            ease: 'Sine.easeOut',
            onComplete: () => {
                container.setDepth(130);
                container.setData('didDrag', false);
                const hitArea = container.getData('hitArea') as Phaser.GameObjects.Rectangle | undefined;
                if (hitArea?.input) {
                    hitArea.input.cursor = 'grab';
                }
            }
        });
    }

    getDropTargetForPoint (x: number, y: number): Side | null
    {
        const leftPosition = this.getTrayWorldPosition('left');
        const rightPosition = this.getTrayWorldPosition('right');
        const halfWidth = BalanceEquationGameScene.TRAY_WIDTH / 2 + 12;
        const halfHeight = BalanceEquationGameScene.TRAY_HEIGHT / 2 + 12;

        if (this.round?.allowLeftPlacement
            && Math.abs(x - leftPosition.x) <= halfWidth
            && Math.abs(y - leftPosition.y) <= halfHeight) {
            return 'left';
        }

        if (this.round?.allowRightPlacement
            && Math.abs(x - rightPosition.x) <= halfWidth
            && Math.abs(y - rightPosition.y) <= halfHeight) {
            return 'right';
        }

        return null;
    }

    getTrayWorldPosition (side: Side)
    {
        const localX = side === 'left' ? BalanceEquationGameScene.LEFT_TRAY_X : BalanceEquationGameScene.RIGHT_TRAY_X;
        const point = new Phaser.Math.Vector2(localX, BalanceEquationGameScene.TRAY_Y);
        point.rotate(this.beamContainer.rotation);
        point.x += this.beamContainer.x;
        point.y += this.beamContainer.y;
        return point;
    }

    updateTrayHighlights (side: Side | null)
    {
        this.leftTrayVisuals.dropGlow.setVisible(side === 'left');
        this.rightTrayVisuals.dropGlow.setVisible(side === 'right');
    }

    placeCrop (side: Side, crop: CropName)
    {
        if (!this.round || !this.acceptingInput) {
            return;
        }

        if ((side === 'left' && !this.round.allowLeftPlacement) || (side === 'right' && !this.round.allowRightPlacement)) {
            return;
        }

        const placements = side === 'left' ? this.leftPlacedCrops : this.rightPlacedCrops;
        if (placements.length >= BalanceEquationGameScene.MAX_PLACED_CROPS_PER_SIDE) {
            this.feedbackText.setText('That tray is full. Tap a crop to take one off.');
            return;
        }

        const previousDifference = Math.abs(this.getLeftTotal() - this.getRightTotal());
        placements.push(crop);
        this.renderTrayContents();
        this.updateBalanceState();

        const nextDifference = Math.abs(this.getLeftTotal() - this.getRightTotal());
        if (nextDifference > previousDifference) {
            this.markAdaptiveRoundMistake();
        }

        if (nextDifference === 0) {
            this.handleSolvedRound();
            return;
        }

        if (this.getLeftTotal() > this.getRightTotal()) {
            this.feedbackText.setText('The left side is still heavier.');
            return;
        }

        this.feedbackText.setText('Now the right side is heavier. Tap a crop to take one off.');
    }

    removeCrop (side: Side, cropIndex: number, isPlaced: boolean)
    {
        if (!this.acceptingInput) {
            return;
        }

        if (isPlaced) {
            const placements = side === 'left' ? this.leftPlacedCrops : this.rightPlacedCrops;
            placements.splice(cropIndex, 1);
        }
        else if (side === this.round?.removableSide) {
            const baseCrops = side === 'left' ? this.round.leftBaseCrops : this.round.rightBaseCrops;
            baseCrops.splice(cropIndex, 1);
        }
        else {
            return;
        }

        this.renderTrayContents();
        this.updateBalanceState();

        if (this.getLeftTotal() === this.getRightTotal()) {
            this.handleSolvedRound();
            return;
        }

        if (this.getLeftTotal() > this.getRightTotal()) {
            this.feedbackText.setText('The left side is still heavier.');
            return;
        }

        this.feedbackText.setText('The right side is still heavier.');
    }

    handleSolvedRound ()
    {
        this.acceptingInput = false;
        const adaptiveResult = this.completeAdaptiveRound();
        const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 1350);
        this.sfx.get('correct')?.play();
        this.feedbackText.setText('Balanced! Both sides are equal.');
        this.updateBalanceState();

        this.time.delayedCall(nextRoundDelay, () => {
            this.generateRound();
        });
    }

    renderTrayContents ()
    {
        this.renderTray('left', this.round?.leftBaseCrops ?? [], this.leftPlacedCrops);
        this.renderTray('right', this.round?.rightBaseCrops ?? [], this.rightPlacedCrops);
    }

    renderTray (side: Side, baseCrops: CropName[], placedCrops: CropName[])
    {
        const trayVisuals = side === 'left' ? this.leftTrayVisuals : this.rightTrayVisuals;
        trayVisuals.content.removeAll(true);

        const allCrops = [
            ...baseCrops.map((crop, cropIndex) => ({ crop, isPlaced: false, cropIndex })),
            ...placedCrops.map((crop, cropIndex) => ({ crop, isPlaced: true, cropIndex }))
        ];
        const columns = 4;
        const horizontalGap = 56;
        const verticalGap = 58;
        const startX = -((columns - 1) * horizontalGap) / 2;
        const startY = -16;

        allCrops.forEach((entry, index) => {
            const x = startX + (index % columns) * horizontalGap;
            const y = startY + Math.floor(index / columns) * verticalGap;
            const isRemovableBaseCrop = !entry.isPlaced && side === this.round?.removableSide;
            const token = this.createCropChip(
                entry.crop,
                entry.isPlaced,
                0.22,
                0.94,
                entry.isPlaced || isRemovableBaseCrop,
                this.round?.showValues ?? true
            );
            token.setPosition(x, y);
            trayVisuals.content.add(token);
            const hitArea = token.getData('hitArea') as Phaser.GameObjects.Rectangle | undefined;

            if (entry.isPlaced) {
                hitArea?.on('pointerup', () => {
                    this.removeCrop(side, entry.cropIndex, true);
                });
            }
            else if (side === this.round?.removableSide) {
                hitArea?.on('pointerup', () => {
                    this.removeCrop(side, entry.cropIndex, false);
                });
            }
        });

        if (allCrops.length === 0) {
            const question = this.addGameText(0, 0, '?', {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 38,
                color: '#b07a45',
                stroke: '#fff8e9',
                strokeThickness: 7,
                align: 'center'
            }).setOrigin(0.5);
            trayVisuals.content.add(question);
        }
    }

    createCropChip (
        crop: CropName,
        highlighted: boolean,
        spriteScale: number,
        chipScale: number,
        interactive: boolean,
        showValue: boolean,
        labelText?: string
    )
    {
        const definition = CROP_VALUE_BY_NAME[crop];
        const container = this.add.container(0, 0).setScale(chipScale);
        const card = this.add.rectangle(0, 0, 62, 62, highlighted ? 0xffefc5 : 0xfff7e3)
            .setStrokeStyle(4, highlighted ? 0xe39a43 : 0x8f5f2e);
        const cropSprite = this.addCropSprite(0, -4, crop)
            .setOrigin(0.5, 0.64)
            .setScale(spriteScale)
            .setDepth(2);
        container.add([card, cropSprite]);

        if (showValue) {
            const badge = this.add.circle(18, -18, 12, definition.color)
                .setStrokeStyle(3, 0xffffff);
            const valueText = this.addGameText(18, -18, `${definition.value}`, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 16,
                color: '#fffdf6',
                stroke: '#7d4d25',
                strokeThickness: 5,
                align: 'center'
            }).setOrigin(0.5);
            container.add([badge, valueText]);
        }

        if (labelText) {
            const label = this.addGameText(0, 38, labelText, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 14,
                color: '#6f512f',
                stroke: '#fff8ec',
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5);
            container.add(label);
        }

        if (interactive) {
            const hitArea = this.add.rectangle(0, 6, 76, 80, 0xffffff, 0.001);
            hitArea.setInteractive({ cursor: 'pointer' });
            container.add(hitArea);
            container.setData('hitArea', hitArea);
            if (hitArea.input) {
                hitArea.input.cursor = 'pointer';
            }
        }

        return container;
    }

    updateBalanceState ()
    {
        const leftTotal = this.getLeftTotal();
        const rightTotal = this.getRightTotal();
        const difference = leftTotal - rightTotal;
        const direction = Phaser.Math.Clamp(difference / 8, -1, 1);
        const targetRotation = Phaser.Math.DegToRad(-14 * direction);

        this.tweens.killTweensOf(this.beamContainer);
        this.tweens.add({
            targets: this.beamContainer,
            rotation: targetRotation,
            duration: 280,
            ease: 'Sine.easeOut'
        });
    }

    getLeftTotal ()
    {
        return this.getCropTotal([
            ...(this.round?.leftBaseCrops ?? []),
            ...this.leftPlacedCrops
        ]);
    }

    getRightTotal ()
    {
        return this.getCropTotal([
            ...(this.round?.rightBaseCrops ?? []),
            ...this.rightPlacedCrops
        ]);
    }

    getCropTotal (crops: CropName[]) {
        return crops.reduce((total, crop) => total + this.getCropValue(crop), 0);
    }

    getCropValue (crop: CropName) {
        return CROP_VALUE_BY_NAME[crop].value;
    }

    getCropLabel (crop: CropName) {
        return CROP_VALUE_BY_NAME[crop].label;
    }

    clearRoundObjects ()
    {
        this.binCards.forEach((card) => card.container.destroy());
        this.binCards = [];
        this.activeDraggedCard = null;
        this.activePointerId = null;
        this.leftTrayVisuals?.content?.removeAll(true);
        this.rightTrayVisuals?.content?.removeAll(true);
        this.input.off('pointermove', this.handlePointerMove, this);
        this.input.off('pointerup', this.handlePointerUp, this);
    }
}
