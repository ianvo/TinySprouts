import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type ShapeKind = 'circle' | 'square' | 'triangle' | 'rectangle' | 'diamond' | 'oval' | 'hexagon';

type ShapeOption = {
    shape: ShapeKind;
    container: Phaser.GameObjects.Container;
};

type ShapeVisualConfig = {
    filled: boolean;
    scale: number;
    depth: number;
    angle?: number;
};

type PropertyPrompt = {
    text: string;
    answer: ShapeKind;
    options: ShapeKind[];
};

export class ShapeMatchGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    targetShape: ShapeKind;
    visualObjects: Phaser.GameObjects.GameObject[];
    options: ShapeOption[];

    constructor ()
    {
        super('ShapeMatchGameScene', 'Shape Match');
        this.targetShape = 'circle';
        this.visualObjects = [];
        this.options = [];
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

        this.promptText = this.addGameText(0, -286, 'Tap the matching shape.', {
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

        const difficultyLevel = this.getDifficultyLevel();
        if (difficultyLevel === 3) {
            const propertyPrompt = this.createPropertyPrompt();
            this.targetShape = propertyPrompt.answer;
            this.promptText.setText(propertyPrompt.text);
            this.renderTarget();
            this.renderOptions(propertyPrompt.options);
            return;
        }

        const availableShapes = this.getAvailableShapes();
        const optionCount = 4;
        this.targetShape = Phaser.Utils.Array.GetRandom(availableShapes);

        const optionShapes = Phaser.Utils.Array.Shuffle([
            this.targetShape,
            ...this.getDistractorShapes(optionCount - 1, availableShapes)
        ]);

        this.promptText.setText(
            difficultyLevel === 1
                ? `Tap the ${this.getShapeLabel(this.targetShape)}.`
                : 'Tap the same shape, even if it changes size or turns.'
        );
        this.renderTarget();
        this.renderOptions(optionShapes);
    }

    getAvailableShapes ()
    {
        if (this.getDifficultyLevel() === 1) {
            return ['circle', 'square', 'triangle'] as ShapeKind[];
        }

        if (this.getDifficultyLevel() === 2) {
            return ['circle', 'square', 'triangle', 'rectangle', 'diamond'] as ShapeKind[];
        }

        return ['circle', 'square', 'triangle', 'rectangle', 'diamond', 'oval', 'hexagon'] as ShapeKind[];
    }

    getDistractorShapes (count: number, availableShapes: ShapeKind[])
    {
        const closeMatches: Record<ShapeKind, ShapeKind[]> = {
            circle: ['oval', 'square', 'hexagon'],
            square: ['rectangle', 'diamond', 'hexagon'],
            triangle: ['diamond', 'rectangle', 'hexagon'],
            rectangle: ['square', 'oval', 'diamond'],
            diamond: ['square', 'rectangle', 'triangle'],
            oval: ['circle', 'rectangle', 'hexagon'],
            hexagon: ['circle', 'square', 'rectangle']
        };

        const candidates = [
            ...closeMatches[this.targetShape],
            ...availableShapes.filter((shape) => shape !== this.targetShape && !closeMatches[this.targetShape].includes(shape))
        ];

        return Phaser.Utils.Array.Shuffle(candidates)
            .filter((shape, index, array) => array.indexOf(shape) === index)
            .slice(0, count);
    }

    createPropertyPrompt (): PropertyPrompt
    {
        const prompts: PropertyPrompt[] = [
            {
                text: 'Tap the shape with 3 sides.',
                answer: 'triangle',
                options: ['triangle', 'diamond', 'rectangle', 'hexagon']
            },
            {
                text: 'Tap the shape with 6 sides.',
                answer: 'hexagon',
                options: ['hexagon', 'circle', 'rectangle', 'diamond']
            },
            {
                text: 'Tap the shape that is perfectly round.',
                answer: 'circle',
                options: ['circle', 'oval', 'square', 'hexagon']
            },
            {
                text: 'Tap the shape that is stretched round.',
                answer: 'oval',
                options: ['oval', 'circle', 'rectangle', 'hexagon']
            },
            {
                text: 'Tap the shape with 4 equal sides and right corners.',
                answer: 'square',
                options: ['square', 'rectangle', 'diamond', 'hexagon']
            },
            {
                text: 'Tap the shape with 2 long sides and 2 short sides.',
                answer: 'rectangle',
                options: ['rectangle', 'square', 'diamond', 'hexagon']
            },
            {
                text: 'Tap the shape with 4 equal sides but no right corners.',
                answer: 'diamond',
                options: ['diamond', 'square', 'rectangle', 'triangle']
            }
        ];

        const prompt = Phaser.Utils.Array.GetRandom(prompts);
        return {
            ...prompt,
            options: Phaser.Utils.Array.Shuffle(prompt.options)
        };
    }

    renderTarget ()
    {
        if (this.getDifficultyLevel() !== 2) {
            return;
        }

        const panel = this.add.rectangle(0, -34, 300, 240, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        const label = this.addGameText(0, -142, 'Find this shape', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);
        this.visualObjects.push(panel, label);
        this.visualObjects.push(...this.createShapeVisual(0, -18, this.targetShape, {
            filled: false,
            scale: 1.75,
            depth: 22
        }));
    }

    renderOptions (shapes: ShapeKind[])
    {
        const positions = shapes.length === 2 ? [-150, 150] : shapes.length === 3 ? [-250, 0, 250] : [-330, -110, 110, 330];
        const difficultyLevel = this.getDifficultyLevel();

        shapes.forEach((shape, index) => {
            const container = this.add.container(positions[index], GameScene.VISUAL_OPTION_Y).setDepth(40);
            const card = this.add.rectangle(0, 0, 180, 108, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setInteractive({ cursor: 'pointer' });
            container.add(card);

            const scale = difficultyLevel === 1 ? 0.95 : Phaser.Math.FloatBetween(0.78, 1.1);
            const angle = difficultyLevel >= 2 ? Phaser.Utils.Array.GetRandom([0, 45, 90, 135, 180, 225, 270]) : 0;
            this.createShapeVisual(0, 0, shape, {
                filled: true,
                scale,
                depth: 45,
                angle
            }).forEach((gameObject) => {
                container.add(gameObject);
            });

            card.on('pointerup', () => {
                this.submitAnswer(shape);
            });
            card.on('pointerover', () => {
                container.setScale(1.04);
            });
            card.on('pointerout', () => {
                container.setScale(1);
            });

            this.options.push({ shape, container });
        });
    }

    createShapeVisual (x: number, y: number, shape: ShapeKind, config: ShapeVisualConfig)
    {
        const fillColor = 0xffd88c;
        const strokeColor = 0x8f5f2e;
        const fillAlpha = config.filled ? 1 : 0;
        const angle = config.angle ?? 0;
        const scale = config.scale;
        const depth = config.depth;

        if (shape === 'circle') {
            return [
                this.add.ellipse(x, y, 68 * scale, 68 * scale, fillColor)
                    .setFillStyle(fillColor, fillAlpha)
                    .setStrokeStyle(5, strokeColor)
                    .setAngle(angle)
                    .setDepth(depth)
            ];
        }

        if (shape === 'square') {
            return [
                this.add.rectangle(x, y, 66 * scale, 66 * scale, fillColor)
                    .setFillStyle(fillColor, fillAlpha)
                    .setStrokeStyle(5, strokeColor)
                    .setAngle(angle)
                    .setDepth(depth)
            ];
        }

        if (shape === 'triangle') {
            return [
                this.add.triangle(x, y, 0, 68 * scale, 34 * scale, 0, 68 * scale, 68 * scale, fillColor)
                    .setFillStyle(fillColor, fillAlpha)
                    .setStrokeStyle(5, strokeColor)
                    .setAngle(angle)
                    .setDepth(depth)
            ];
        }

        if (shape === 'rectangle') {
            return [
                this.add.rectangle(x, y, 92 * scale, 56 * scale, fillColor)
                    .setFillStyle(fillColor, fillAlpha)
                    .setStrokeStyle(5, strokeColor)
                    .setAngle(angle)
                    .setDepth(depth)
            ];
        }

        if (shape === 'diamond') {
            const halfWidth = 50 * scale;
            const halfHeight = 34 * scale;
            return [
                this.add.polygon(
                    x,
                    y,
                    [
                        halfWidth, 0,
                        halfWidth * 2, halfHeight,
                        halfWidth, halfHeight * 2,
                        0, halfHeight
                    ],
                    fillColor
                )
                    .setDisplayOrigin(halfWidth, halfHeight)
                    .setFillStyle(fillColor, fillAlpha)
                    .setStrokeStyle(5, strokeColor)
                    .setAngle(angle)
                    .setDepth(depth)
            ];
        }

        if (shape === 'hexagon') {
            const shortHalfWidth = 24 * scale;
            const longHalfWidth = 44 * scale;
            const halfHeight = 38 * scale;
            return [
                this.add.polygon(
                    x,
                    y,
                    [
                        shortHalfWidth, 0,
                        shortHalfWidth + longHalfWidth, 0,
                        shortHalfWidth + longHalfWidth + shortHalfWidth, halfHeight,
                        shortHalfWidth + longHalfWidth, halfHeight * 2,
                        shortHalfWidth, halfHeight * 2,
                        0, halfHeight
                    ],
                    fillColor
                )
                    .setDisplayOrigin(shortHalfWidth + longHalfWidth / 2, halfHeight)
                    .setFillStyle(fillColor, fillAlpha)
                    .setStrokeStyle(5, strokeColor)
                    .setAngle(angle)
                    .setDepth(depth)
            ];
        }

        return [
            this.add.ellipse(x, y, 92 * scale, 62 * scale, fillColor)
                .setFillStyle(fillColor, fillAlpha)
                .setStrokeStyle(5, strokeColor)
                .setAngle(angle)
                .setDepth(depth)
        ];
    }

    submitAnswer (shape: ShapeKind)
    {
        if (shape === this.targetShape) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 850);
            this.sfx.get('correct')?.play();
            this.feedbackText.setText(
                this.getDifficultyLevel() === 1
                    ? 'That is the right shape.'
                    : this.getDifficultyLevel() === 2
                        ? 'That matches the target shape.'
                        : 'That fits the rule.'
            );
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

    getShapeLabel (shape: ShapeKind)
    {
        if (shape === 'circle') {
            return 'circle';
        }

        if (shape === 'square') {
            return 'square';
        }

        if (shape === 'triangle') {
            return 'triangle';
        }

        if (shape === 'rectangle') {
            return 'rectangle';
        }

        if (shape === 'diamond') {
            return 'diamond';
        }

        if (shape === 'oval') {
            return 'oval';
        }

        return 'hexagon';
    }

    clearRound ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
        this.options.forEach((option) => option.container.destroy());
        this.options = [];
    }

    update () {}

    changeScene () {}
}
