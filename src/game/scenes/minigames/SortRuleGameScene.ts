import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import { CropName } from '../../crops';

type SortKind = 'fruit' | 'vegetable';
type SortSize = 'small' | 'large';
type BinKey = CropName | 'small' | 'large' | 'small-fruit' | 'large-fruit' | 'small-vegetable' | 'large-vegetable';

type SortItem = {
    kind: SortKind;
    size: SortSize;
    crop: CropName;
    binKey: BinKey;
    object: Phaser.GameObjects.Sprite;
    homeX: number;
    homeY: number;
    selected: boolean;
    placed: boolean;
};

type SortBin = {
    key: BinKey;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    card: Phaser.GameObjects.Rectangle;
    slotsUsed: number;
};

export class SortRuleGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    items: SortItem[];
    bins: SortBin[];
    extraObjects: Phaser.GameObjects.GameObject[];
    levelOneCrops: CropName[];

    static readonly FRUIT_CROPS: CropName[] = ['apple', 'blueberry', 'strawberry', 'watermelon'];
    static readonly VEGETABLE_CROPS: CropName[] = [
        'broccoli',
        'cabbage',
        'carrot',
        'corn',
        'eggplant',
        'lettuce',
        'onion',
        'peas',
        'potato',
        'pumpkin',
        'radish',
        'turnip'
    ];

    constructor ()
    {
        super('SortRuleGameScene', 'Sorting');
        this.items = [];
        this.bins = [];
        this.extraObjects = [];
        this.levelOneCrops = [];
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
            fontSize: 48,
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
        this.levelOneCrops = this.getDifficultyLevel() === 1
            ? Phaser.Utils.Array.Shuffle([...SortRuleGameScene.FRUIT_CROPS, ...SortRuleGameScene.VEGETABLE_CROPS]).slice(0, 2)
            : [];

        this.promptText.setText(this.getPromptText());
        this.createSortingArea();
        this.createBins();
        this.createItems();
    }

    getPromptText ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        if (difficultyLevel === 1) {
            const [firstCrop = 'apple', secondCrop = 'carrot'] = this.levelOneCrops;
            return `Sort the ${this.getCropLabel(firstCrop)} and ${this.getCropLabel(secondCrop)} into the matching bins.`;
        }

        if (difficultyLevel === 2) {
            return 'Sort the small and large crops into the right bins.';
        }

        return 'Sort each item into the matching bin.';
    }

    createSortingArea ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const panelHeight = difficultyLevel === 3 ? 244 : 300;
        const panelY = difficultyLevel === 3 ? -42 : 10;
        const panel = this.add.rectangle(0, panelY, 760, panelHeight, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(5);
        const label = this.addGameText(0, panelY - panelHeight / 2 - 22, 'Items to Sort', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(15);

        this.extraObjects.push(panel, label);
    }

    createBins ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const binDefs = difficultyLevel === 1
            ? [
                { key: this.levelOneCrops[0] ?? 'apple', label: this.getCropLabel(this.levelOneCrops[0] ?? 'apple'), x: -180, y: 238 },
                { key: this.levelOneCrops[1] ?? 'carrot', label: this.getCropLabel(this.levelOneCrops[1] ?? 'carrot'), x: 180, y: 238 }
            ]
            : difficultyLevel === 2
                ? [
                    { key: 'small' as BinKey, label: 'Small', x: -180, y: 238 },
                    { key: 'large' as BinKey, label: 'Large', x: 180, y: 238 }
                ]
                : [
                    { key: 'small-fruit' as BinKey, label: 'Small Fruits', x: -240, y: 220 },
                    { key: 'large-fruit' as BinKey, label: 'Large Fruits', x: 240, y: 220 },
                    { key: 'small-vegetable' as BinKey, label: 'Small Vegetables', x: -240, y: 332 },
                    { key: 'large-vegetable' as BinKey, label: 'Large Vegetables', x: 240, y: 332 }
                ];

        binDefs.forEach((binDef) => {
            const width = difficultyLevel === 3 ? 260 : 300;
            const height = 92;
            const card = this.add.rectangle(binDef.x, binDef.y, width, height, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ dropZone: true })
                .setDepth(10);
            const label = this.addGameText(binDef.x, binDef.y - 26, binDef.label, {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: difficultyLevel === 3 ? 22 : 26,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5).setDepth(20);

            const bin: SortBin = {
                key: binDef.key,
                label: binDef.label,
                x: binDef.x,
                y: binDef.y,
                width,
                height,
                card,
                slotsUsed: 0
            };

            this.bins.push(bin);
            this.extraObjects.push(label);
            this.addBinExample(bin);
        });
    }

    createItems ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const itemCount = difficultyLevel === 1 ? 8 : difficultyLevel === 2 ? 10 : 12;
        const columns = 4;
        const spacingX = 160;
        const spacingY = difficultyLevel === 3 ? 82 : 104;
        const startX = -((columns - 1) * spacingX) / 2;
        const startY = difficultyLevel === 3 ? -116 : itemCount > 8 ? -54 : -4;
        const itemDefs = this.generateItemDefinitions(itemCount);

        for (let index = 0; index < itemCount; index++) {
            const itemDef = itemDefs[index];
            const x = startX + (index % columns) * spacingX;
            const y = startY + Math.floor(index / columns) * spacingY;
            const object = this.createItemVisual(x, y, itemDef.crop, itemDef.size);
            const item: SortItem = {
                kind: itemDef.kind,
                size: itemDef.size,
                crop: itemDef.crop,
                binKey: this.getItemBinKey(itemDef.crop, itemDef.kind, itemDef.size),
                object,
                homeX: x,
                homeY: y,
                selected: false,
                placed: false
            };

            object.setInteractive({ cursor: 'pointer' });
            this.input.setDraggable(object);

            object.on('dragstart', () => {
                if (item.placed) {
                    return;
                }

                this.highlightItem(item, true);
                object.setDepth(40);
                this.feedbackText.setText('Drag it into the correct bin.');
            });

            object.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                if (item.placed) {
                    return;
                }

                object.x = dragX;
                object.y = dragY;
            });

            object.on('drop', (_pointer: Phaser.Input.Pointer, dropZone: Phaser.GameObjects.GameObject) => {
                if (item.placed) {
                    return;
                }

                const bin = this.bins.find((entry) => entry.card === dropZone);
                if (bin) {
                    this.placeItemInBin(item, bin);
                }
            });

            object.on('dragend', (_pointer: Phaser.Input.Pointer, dropped: boolean) => {
                if (item.placed) {
                    return;
                }

                if (!dropped) {
                    this.snapItemHome(item);
                }
            });

            this.items.push(item);
        }
    }

    generateItemDefinitions (itemCount: number)
    {
        const difficultyLevel = this.getDifficultyLevel();
        const items: Array<{ kind: SortKind; size: SortSize; crop: CropName }> = [];

        if (difficultyLevel === 1) {
            const firstCropCount = Math.floor(itemCount / 2);
            const secondCropCount = itemCount - firstCropCount;
            const [firstCrop = 'apple', secondCrop = 'carrot'] = this.levelOneCrops;
            items.push(...this.createSpecificCropItems(firstCrop, firstCropCount));
            items.push(...this.createSpecificCropItems(secondCrop, secondCropCount));
        }
        else if (difficultyLevel === 2) {
            const smallCount = Math.floor(itemCount / 2);
            const largeCount = itemCount - smallCount;
            items.push(...this.createSizeItems('small', smallCount));
            items.push(...this.createSizeItems('large', largeCount));
        }
        else {
            const combos: Array<{ kind: SortKind; size: SortSize }> = [
                { kind: 'fruit', size: 'small' },
                { kind: 'fruit', size: 'large' },
                { kind: 'vegetable', size: 'small' },
                { kind: 'vegetable', size: 'large' }
            ];

            combos.forEach((combo) => {
                items.push({
                    ...combo,
                    crop: this.getRandomCrop(combo.kind)
                });
            });

            while (items.length < itemCount) {
                const combo = combos[items.length % combos.length];
                items.push({
                    ...combo,
                    crop: this.getRandomCrop(combo.kind)
                });
            }
        }

        return Phaser.Utils.Array.Shuffle(items);
    }

    createCategoryItems (kind: SortKind, count: number)
    {
        return Array.from({ length: count }, () => ({
            kind,
            size: Phaser.Utils.Array.GetRandom<SortSize>(['small', 'large']),
            crop: this.getRandomCrop(kind)
        }));
    }

    createSpecificCropItems (crop: CropName, count: number)
    {
        const kind = this.getCropKind(crop);
        return Array.from({ length: count }, () => ({
            kind,
            size: Phaser.Utils.Array.GetRandom<SortSize>(['small', 'large']),
            crop
        }));
    }

    createSizeItems (size: SortSize, count: number)
    {
        return Array.from({ length: count }, (_, index) => {
            const kind: SortKind = index % 2 === 0 ? 'fruit' : 'vegetable';
            return {
                kind,
                size,
                crop: this.getRandomCrop(kind)
            };
        });
    }

    getRandomCrop (kind: SortKind)
    {
        return Phaser.Utils.Array.GetRandom(
            kind === 'fruit' ? SortRuleGameScene.FRUIT_CROPS : SortRuleGameScene.VEGETABLE_CROPS
        );
    }

    getCropKind (crop: CropName): SortKind
    {
        return SortRuleGameScene.FRUIT_CROPS.includes(crop) ? 'fruit' : 'vegetable';
    }

    getBinKey (kind: SortKind, size: SortSize)
    {
        if (this.getDifficultyLevel() === 2) {
            return size;
        }

        return `${size}-${kind}` as BinKey;
    }

    getItemBinKey (crop: CropName, kind: SortKind, size: SortSize)
    {
        if (this.getDifficultyLevel() === 1) {
            return crop;
        }

        return this.getBinKey(kind, size);
    }

    createItemVisual (x: number, y: number, crop: CropName, size: SortSize)
    {
        return this.configureCropSprite(this.addCropSprite(x, y, crop))
            .setScale(this.getScaleForState(size, 'home'))
            .setDepth(20);
    }

    highlightItem (item: SortItem, selected: boolean)
    {
        item.selected = selected;

        if (selected) {
            item.object.setTint(0xffefad);
            item.object.setScale(this.getScaleForState(item.size, 'selected'));
        }
        else {
            item.object.clearTint();
            if (!item.placed) {
                item.object.setScale(this.getScaleForState(item.size, 'home'));
            }
        }
    }

    placeItemInBin (item: SortItem, bin: SortBin)
    {
        if (bin.key !== item.binKey) {
            this.markAdaptiveRoundMistake();
            this.sfx.get('incorrect')?.play();
            this.feedbackText.setText('That bin does not match.');
            this.cameras.main.shake(180, 0.002);
            this.snapItemHome(item);
            return;
        }

        const slotPosition = this.getBinSlotPosition(bin);
        item.placed = true;
        this.highlightItem(item, false);
        this.sfx.get('correct')?.play();
        this.feedbackText.setText('Sorted.');

        this.tweens.add({
            targets: item.object,
            x: slotPosition.x,
            y: slotPosition.y,
            duration: 220,
            ease: 'Sine.easeOut',
            onComplete: () => {
                item.object.clearTint();
                item.object.setScale(this.getScaleForState(item.size, 'bin'));
                item.object.setDepth(20);
            }
        });

        if (this.items.every((entry) => entry.placed)) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 850);
            this.feedbackText.setText('Everything is sorted.');
            this.time.delayedCall(nextRoundDelay, () => {
                this.generateRound();
            });
            return;
        }

        this.time.delayedCall(350, () => {
            this.feedbackText.setText('');
        });
    }

    snapItemHome (item: SortItem)
    {
        this.highlightItem(item, false);
        this.tweens.add({
            targets: item.object,
            x: item.homeX,
            y: item.homeY,
            duration: 180,
            ease: 'Sine.easeOut',
            onComplete: () => {
                item.object.setDepth(20);
                this.feedbackText.setText('');
            }
        });
    }

    getBinSlotPosition (bin: SortBin)
    {
        const index = bin.slotsUsed;
        bin.slotsUsed += 1;
        const columns = this.getDifficultyLevel() === 3 ? 4 : 5;
        const horizontalGap = this.getDifficultyLevel() === 3 ? 26 : 22;
        const verticalGap = 22;
        const localX = -((columns - 1) * horizontalGap) / 2 + (index % columns) * horizontalGap;
        const localY = 8 + Math.floor(index / columns) * verticalGap;
        return {
            x: bin.x + localX,
            y: bin.y + localY
        };
    }

    getCropLabel (crop: CropName)
    {
        return crop.replace(/_/g, ' ');
    }

    addBinExample (bin: SortBin)
    {
        const difficultyLevel = this.getDifficultyLevel();
        if (difficultyLevel === 1) {
            return;
        }

        const size: SortSize = bin.key.startsWith('small') || bin.key === 'small' ? 'small' : 'large';
        const crop: CropName = bin.key.includes('vegetable') ? 'carrot' : 'apple';
        const example = this.addCropSprite(bin.x, bin.y + 12, crop)
            .setOrigin(0.5, 0.78)
            .setScale(this.getScaleForState(size, 'example'))
            .setDepth(18)
            .setAlpha(0.95);

        this.extraObjects.push(example);
    }

    getScaleForState (size: SortSize, state: 'home' | 'selected' | 'bin' | 'example')
    {
        const scaleBySize = {
            small: {
                home: 0.16,
                selected: 0.19,
                bin: 0.11,
                example: 0.14
            },
            large: {
                home: 0.34,
                selected: 0.39,
                bin: 0.2,
                example: 0.28
            }
        };

        return scaleBySize[size][state];
    }

    configureCropSprite (sprite: Phaser.GameObjects.Sprite)
    {
        return sprite.setOrigin(0.5, 0.78);
    }

    clearRound ()
    {
        this.items.forEach((item) => item.object.destroy());
        this.items = [];
        this.bins.forEach((bin) => bin.card.destroy());
        this.bins = [];
        this.extraObjects.forEach((gameObject) => gameObject.destroy());
        this.extraObjects = [];
    }

    update () {}

    changeScene () {}
}
