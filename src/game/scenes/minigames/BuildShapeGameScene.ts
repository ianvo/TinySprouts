import { Howl } from 'howler';
import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';

type PieceKind = 'triangle' | 'square' | 'rectangle';

type PieceSlot = {
    kind: PieceKind;
    x: number;
    y: number;
    angle?: number;
    scale?: number;
};

type BuildTarget = {
    name: string;
    slots: PieceSlot[];
};

type PieceChoice = {
    kind: PieceKind;
    container: Phaser.GameObjects.Container;
    piece: Phaser.GameObjects.Shape;
    targetAngle: number;
    targetScale: number;
    previewScale: number;
    isDistractor: boolean;
    homeX: number;
    homeY: number;
    dragOffsetX: number;
    dragOffsetY: number;
    used: boolean;
};

type PiecePlacementSlot = {
    index: number;
    kind: PieceKind;
    x: number;
    y: number;
    angle: number;
    scale: number;
    filled: boolean;
    dropZone: Phaser.GameObjects.Rectangle;
};

type ResolvedPieceSlot = {
    kind: PieceKind;
    x: number;
    y: number;
    angle: number;
    scale: number;
};

type SourcePiece = {
    kind: PieceKind;
    angle: number;
    scale: number;
    isDistractor: boolean;
};

const squareSlot = (x: number, y: number, scale = 1): PieceSlot => ({ kind: 'square', x, y, scale });
const triangleSlot = (x: number, y: number, angle = 0, scale = 1): PieceSlot => ({ kind: 'triangle', x, y, angle, scale });
const rectangleSlot = (x: number, y: number, angle = 0, scale = 1): PieceSlot => ({ kind: 'rectangle', x, y, angle, scale });

const BUILD_TARGETS: Record<number, BuildTarget[]> = {
    1: [
        {
            name: 'house',
            slots: [
                { kind: 'square', x: 0, y: 20, scale: 1 },
                { kind: 'triangle', x: 0, y: -44, scale: 1.05 }
            ]
        },
        {
            name: 'kite',
            slots: [
                { kind: 'triangle', x: 0, y: -14, angle: 0, scale: 1 },
                { kind: 'triangle', x: 0, y: 26, angle: 180, scale: 1 }
            ]
        },
        {
            name: 'wagon',
            slots: [
                { kind: 'rectangle', x: -36, y: 10, scale: 0.95 },
                { kind: 'rectangle', x: 36, y: 10, scale: 0.95 }
            ]
        },
        {
            name: 'tent',
            slots: [
                { kind: 'triangle', x: -32, y: 0, angle: 0, scale: 0.9 },
                { kind: 'triangle', x: 32, y: 0, angle: 0, scale: 0.9 }
            ]
        },
        {
            name: 'ramp',
            slots: [
                { kind: 'rectangle', x: -40, y: 18, scale: 0.95 },
                { kind: 'triangle', x: 42, y: -4, angle: 90, scale: 0.95 }
            ]
        },
        {
            name: 'sail',
            slots: [
                { kind: 'rectangle', x: -26, y: 10, angle: 90, scale: 0.8 },
                { kind: 'triangle', x: 26, y: -8, angle: 90, scale: 0.95 }
            ]
        },
        {
            name: 'gate',
            slots: [
                { kind: 'rectangle', x: -28, y: 0, angle: 90, scale: 0.82 },
                { kind: 'rectangle', x: 28, y: 0, angle: 90, scale: 0.82 }
            ]
        },
        {
            name: 'boat',
            slots: [
                rectangleSlot(0, 24, 0, 0.88),
                triangleSlot(0, -26, 0, 0.9)
            ]
        },
        {
            name: 'flag',
            slots: [
                rectangleSlot(-24, 12, 90, 0.78),
                triangleSlot(30, -6, 90, 0.9)
            ]
        },
        {
            name: 'chimney',
            slots: [
                squareSlot(0, 30, 0.84),
                rectangleSlot(0, -28, 90, 0.76)
            ]
        },
        {
            name: 'diamond',
            slots: [
                triangleSlot(0, -16, 0, 0.9),
                triangleSlot(0, 20, 180, 0.9)
            ]
        },
        {
            name: 'path',
            slots: [
                rectangleSlot(-30, 12, 0, 0.82),
                rectangleSlot(34, 12, 0, 0.82)
            ]
        },
        {
            name: 'corner',
            slots: [
                rectangleSlot(-20, 22, 90, 0.8),
                rectangleSlot(26, 22, 0, 0.8)
            ]
        },
        {
            name: 'bench',
            slots: [
                rectangleSlot(-26, 20, 90, 0.72),
                rectangleSlot(26, 20, 90, 0.72)
            ]
        },
        {
            name: 'arrowhead',
            slots: [
                triangleSlot(-24, 0, 270, 0.88),
                triangleSlot(24, 0, 90, 0.88)
            ]
        },
        {
            name: 'roof',
            slots: [
                triangleSlot(-30, 8, 0, 0.84),
                triangleSlot(30, 8, 0, 0.84)
            ]
        },
        {
            name: 'window',
            slots: [
                squareSlot(-28, 0, 0.76),
                squareSlot(28, 0, 0.76)
            ]
        },
        {
            name: 'sign',
            slots: [
                rectangleSlot(0, 28, 90, 0.72),
                squareSlot(0, -20, 0.78)
            ]
        },
        {
            name: 'slide',
            slots: [
                triangleSlot(-24, 0, 270, 0.86),
                rectangleSlot(24, 18, 90, 0.72)
            ]
        },
        {
            name: 'table',
            slots: [
                rectangleSlot(0, -12, 0, 0.82),
                rectangleSlot(0, 32, 90, 0.72)
            ]
        }
    ],
    2: [
        {
            name: 'barn',
            slots: [
                { kind: 'square', x: -34, y: 24, scale: 0.95 },
                { kind: 'square', x: 34, y: 24, scale: 0.95 },
                { kind: 'triangle', x: 0, y: -42, scale: 1.1 }
            ]
        },
        {
            name: 'bridge',
            slots: [
                { kind: 'triangle', x: -70, y: 8, angle: 270, scale: 0.95 },
                { kind: 'rectangle', x: 0, y: 8, scale: 1.05 },
                { kind: 'triangle', x: 70, y: 8, angle: 90, scale: 0.95 }
            ]
        },
        {
            name: 'tower',
            slots: [
                { kind: 'rectangle', x: 0, y: 42, scale: 0.9 },
                { kind: 'rectangle', x: 0, y: -2, scale: 0.9 },
                { kind: 'square', x: 0, y: -56, scale: 0.85 }
            ]
        },
        {
            name: 'arch',
            slots: [
                { kind: 'rectangle', x: -54, y: 22, angle: 90, scale: 0.82 },
                { kind: 'rectangle', x: 54, y: 22, angle: 90, scale: 0.82 },
                { kind: 'rectangle', x: 0, y: -34, scale: 1.05 }
            ]
        },
        {
            name: 'arrow',
            slots: [
                { kind: 'triangle', x: -74, y: 0, angle: 270, scale: 0.88 },
                { kind: 'rectangle', x: -4, y: 0, scale: 0.92 },
                { kind: 'triangle', x: 66, y: 0, angle: 90, scale: 0.88 }
            ]
        },
        {
            name: 'cabin',
            slots: [
                { kind: 'square', x: -34, y: 26, scale: 0.88 },
                { kind: 'square', x: 34, y: 26, scale: 0.88 },
                { kind: 'rectangle', x: 0, y: -34, scale: 1.02 }
            ]
        },
        {
            name: 'steps',
            slots: [
                { kind: 'square', x: -54, y: 34, scale: 0.82 },
                { kind: 'square', x: 0, y: 0, scale: 0.82 },
                { kind: 'square', x: 54, y: -34, scale: 0.82 }
            ]
        },
        {
            name: 'wagon',
            slots: [
                squareSlot(-54, 22, 0.76),
                squareSlot(0, 22, 0.76),
                squareSlot(54, 22, 0.76)
            ]
        },
        {
            name: 'small house',
            slots: [
                squareSlot(-30, 26, 0.8),
                squareSlot(30, 26, 0.8),
                triangleSlot(0, -26, 0, 0.94)
            ]
        },
        {
            name: 'long arrow',
            slots: [
                triangleSlot(-64, 0, 270, 0.82),
                rectangleSlot(-4, 0, 0, 0.84),
                triangleSlot(56, 0, 90, 0.82)
            ]
        },
        {
            name: 'gate house',
            slots: [
                rectangleSlot(-46, 18, 90, 0.74),
                rectangleSlot(46, 18, 90, 0.74),
                triangleSlot(0, -34, 0, 0.92)
            ]
        },
        {
            name: 'arch roof',
            slots: [
                rectangleSlot(-46, 24, 90, 0.72),
                rectangleSlot(46, 24, 90, 0.72),
                rectangleSlot(0, -24, 0, 0.96)
            ]
        },
        {
            name: 'cart',
            slots: [
                rectangleSlot(-58, 10, 0, 0.72),
                rectangleSlot(0, 10, 0, 0.72),
                rectangleSlot(58, 10, 0, 0.72)
            ]
        },
        {
            name: 'tower roof',
            slots: [
                rectangleSlot(0, 44, 90, 0.8),
                squareSlot(0, -6, 0.76),
                triangleSlot(0, -62, 0, 0.82)
            ]
        },
        {
            name: 'trailer',
            slots: [
                squareSlot(-50, 22, 0.76),
                squareSlot(0, 22, 0.76),
                rectangleSlot(54, 10, 0, 0.72)
            ]
        },
        {
            name: 'bridge house',
            slots: [
                triangleSlot(-64, 6, 270, 0.8),
                squareSlot(0, 6, 0.78),
                triangleSlot(64, 6, 90, 0.8)
            ]
        },
        {
            name: 'crossroad',
            slots: [
                rectangleSlot(0, 0, 0, 0.82),
                rectangleSlot(0, 0, 90, 0.82),
                squareSlot(0, 0, 0.64)
            ]
        },
        {
            name: 'tree',
            slots: [
                triangleSlot(0, -46, 0, 0.86),
                squareSlot(0, 10, 0.7),
                rectangleSlot(0, 58, 90, 0.62)
            ]
        },
        {
            name: 'shelter',
            slots: [
                triangleSlot(-54, -6, 0, 0.78),
                triangleSlot(54, -6, 0, 0.78),
                rectangleSlot(0, 28, 0, 0.94)
            ]
        },
        {
            name: 'row house',
            slots: [
                squareSlot(-56, 24, 0.74),
                squareSlot(0, 24, 0.74),
                squareSlot(56, 24, 0.74)
            ]
        }
    ],
    3: [
        {
            name: 'big barn',
            slots: [
                { kind: 'square', x: -72, y: 30, scale: 0.82 },
                { kind: 'square', x: 0, y: 30, scale: 0.82 },
                { kind: 'square', x: 72, y: 30, scale: 0.82 },
                { kind: 'triangle', x: 0, y: -36, scale: 1.04 },
                { kind: 'rectangle', x: 0, y: 92, scale: 0.78 }
            ]
        },
        {
            name: 'long bridge',
            slots: [
                { kind: 'triangle', x: -136, y: 8, angle: 270, scale: 0.76 },
                { kind: 'rectangle', x: -64, y: 8, scale: 0.76 },
                { kind: 'square', x: 0, y: 8, scale: 0.7 },
                { kind: 'rectangle', x: 64, y: 8, scale: 0.76 },
                { kind: 'triangle', x: 136, y: 8, angle: 90, scale: 0.76 }
            ]
        },
        {
            name: 'roof row',
            slots: [
                { kind: 'square', x: -108, y: 34, scale: 0.74 },
                { kind: 'square', x: -36, y: 34, scale: 0.74 },
                { kind: 'square', x: 36, y: 34, scale: 0.74 },
                { kind: 'square', x: 108, y: 34, scale: 0.74 },
                { kind: 'triangle', x: 0, y: -30, scale: 1.02 }
            ]
        },
        {
            name: 'windmill',
            slots: [
                { kind: 'triangle', x: 0, y: -92, angle: 0, scale: 0.72 },
                { kind: 'triangle', x: 92, y: 0, angle: 90, scale: 0.72 },
                { kind: 'triangle', x: 0, y: 92, angle: 180, scale: 0.72 },
                { kind: 'triangle', x: -92, y: 0, angle: 270, scale: 0.72 },
                { kind: 'square', x: 0, y: 0, scale: 0.64 }
            ]
        },
        {
            name: 'long train',
            slots: [
                { kind: 'square', x: -136, y: 34, scale: 0.7 },
                { kind: 'square', x: -68, y: 34, scale: 0.7 },
                { kind: 'square', x: 0, y: 34, scale: 0.7 },
                { kind: 'square', x: 68, y: 34, scale: 0.7 },
                { kind: 'square', x: 136, y: 34, scale: 0.7 },
                { kind: 'triangle', x: 0, y: -30, scale: 0.96 }
            ]
        },
        {
            name: 'double bridge',
            slots: [
                { kind: 'triangle', x: -154, y: 8, angle: 270, scale: 0.72 },
                { kind: 'rectangle', x: -92, y: 8, scale: 0.7 },
                { kind: 'rectangle', x: -28, y: 8, scale: 0.7 },
                { kind: 'rectangle', x: 36, y: 8, scale: 0.7 },
                { kind: 'rectangle', x: 100, y: 8, scale: 0.7 },
                { kind: 'triangle', x: 162, y: 8, angle: 90, scale: 0.72 }
            ]
        },
        {
            name: 'tall gate',
            slots: [
                { kind: 'rectangle', x: -56, y: 74, angle: 90, scale: 0.7 },
                { kind: 'rectangle', x: -56, y: 6, angle: 90, scale: 0.7 },
                { kind: 'rectangle', x: -56, y: -62, angle: 90, scale: 0.7 },
                { kind: 'rectangle', x: 56, y: 74, angle: 90, scale: 0.7 },
                { kind: 'rectangle', x: 56, y: 6, angle: 90, scale: 0.7 },
                { kind: 'rectangle', x: 56, y: -62, angle: 90, scale: 0.7 }
            ]
        },
        {
            name: 'wide barn',
            slots: [
                { kind: 'square', x: -108, y: 36, scale: 0.72 },
                { kind: 'square', x: -36, y: 36, scale: 0.72 },
                { kind: 'square', x: 36, y: 36, scale: 0.72 },
                { kind: 'square', x: 108, y: 36, scale: 0.72 },
                { kind: 'triangle', x: 0, y: -28, scale: 1.02 },
                { kind: 'rectangle', x: 0, y: 96, scale: 0.74 }
            ]
        },
        {
            name: 'castle wall',
            slots: [
                squareSlot(-144, 44, 0.66),
                squareSlot(-72, 44, 0.66),
                squareSlot(0, 44, 0.66),
                squareSlot(72, 44, 0.66),
                squareSlot(144, 44, 0.66),
                triangleSlot(0, -20, 0, 0.9)
            ]
        },
        {
            name: 'station',
            slots: [
                squareSlot(-108, 38, 0.68),
                squareSlot(-36, 38, 0.68),
                squareSlot(36, 38, 0.68),
                squareSlot(108, 38, 0.68),
                rectangleSlot(0, -12, 0, 0.82),
                rectangleSlot(0, 94, 0, 0.7)
            ]
        },
        {
            name: 'fort',
            slots: [
                squareSlot(-116, 40, 0.68),
                squareSlot(-38, 40, 0.68),
                squareSlot(38, 40, 0.68),
                squareSlot(116, 40, 0.68),
                rectangleSlot(-78, -18, 90, 0.62),
                rectangleSlot(78, -18, 90, 0.62)
            ]
        },
        {
            name: 'village',
            slots: [
                squareSlot(-120, 44, 0.64),
                squareSlot(-40, 44, 0.64),
                squareSlot(40, 44, 0.64),
                squareSlot(120, 44, 0.64),
                triangleSlot(-40, -8, 0, 0.72),
                triangleSlot(40, -8, 0, 0.72)
            ]
        },
        {
            name: 'grand gate',
            slots: [
                rectangleSlot(-102, 14, 90, 0.64),
                rectangleSlot(-34, 14, 90, 0.64),
                rectangleSlot(34, 14, 90, 0.64),
                rectangleSlot(102, 14, 90, 0.64),
                rectangleSlot(0, -56, 0, 0.92),
                rectangleSlot(0, 82, 0, 0.82)
            ]
        },
        {
            name: 'market',
            slots: [
                squareSlot(-118, 48, 0.64),
                squareSlot(-40, 48, 0.64),
                squareSlot(40, 48, 0.64),
                squareSlot(118, 48, 0.64),
                triangleSlot(-40, -6, 0, 0.68),
                triangleSlot(40, -6, 0, 0.68)
            ]
        },
        {
            name: 'harbor',
            slots: [
                triangleSlot(-150, 14, 270, 0.66),
                rectangleSlot(-90, 14, 0, 0.66),
                rectangleSlot(-26, 14, 0, 0.66),
                rectangleSlot(38, 14, 0, 0.66),
                rectangleSlot(102, 14, 0, 0.66),
                triangleSlot(162, 14, 90, 0.66)
            ]
        },
        {
            name: 'tunnel',
            slots: [
                rectangleSlot(-108, 20, 90, 0.64),
                rectangleSlot(-36, 20, 90, 0.64),
                rectangleSlot(36, 20, 90, 0.64),
                rectangleSlot(108, 20, 90, 0.64),
                rectangleSlot(0, -54, 0, 0.96),
                rectangleSlot(0, 94, 0, 0.76)
            ]
        },
        {
            name: 'stepped roof',
            slots: [
                squareSlot(-112, 56, 0.62),
                squareSlot(-38, 20, 0.62),
                squareSlot(38, 20, 0.62),
                squareSlot(112, 56, 0.62),
                triangleSlot(-38, -42, 0, 0.7),
                triangleSlot(38, -42, 0, 0.7)
            ]
        },
        {
            name: 'long barn',
            slots: [
                squareSlot(-144, 44, 0.64),
                squareSlot(-72, 44, 0.64),
                squareSlot(0, 44, 0.64),
                squareSlot(72, 44, 0.64),
                squareSlot(144, 44, 0.64),
                triangleSlot(0, -14, 0, 0.92)
            ]
        },
        {
            name: 'ladder',
            slots: [
                rectangleSlot(-54, 68, 90, 0.62),
                rectangleSlot(-54, 0, 90, 0.62),
                rectangleSlot(-54, -68, 90, 0.62),
                rectangleSlot(54, 68, 90, 0.62),
                rectangleSlot(54, 0, 90, 0.62),
                rectangleSlot(54, -68, 90, 0.62)
            ]
        },
        {
            name: 'crown',
            slots: [
                triangleSlot(-120, 16, 0, 0.66),
                triangleSlot(-40, -28, 0, 0.66),
                triangleSlot(40, -28, 0, 0.66),
                triangleSlot(120, 16, 0, 0.66),
                rectangleSlot(-40, 62, 0, 0.66),
                rectangleSlot(40, 62, 0, 0.66)
            ]
        }
    ]
};

export class BuildShapeGameScene extends GameScene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    promptText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    target!: BuildTarget;
    visualObjects: Phaser.GameObjects.GameObject[];
    choicePieces: PieceChoice[];
    placementSlots: PiecePlacementSlot[];
    previousTargetName: string | null;

    constructor ()
    {
        super('BuildShapeGameScene', 'Build the Shape');
        this.visualObjects = [];
        this.choicePieces = [];
        this.placementSlots = [];
        this.previousTargetName = null;
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
        const availableTargets = BUILD_TARGETS[difficultyLevel];
        const nextTargetPool = availableTargets.filter((target) => target.name !== this.previousTargetName);
        this.target = Phaser.Utils.Array.GetRandom(nextTargetPool.length > 0 ? nextTargetPool : availableTargets);
        this.previousTargetName = this.target.name;
        this.promptText.setText(`Drag the pieces to build the ${this.target.name}.`);

        this.renderTarget();
        this.renderChoices();
    }

    renderTarget ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const resolvedSlots = this.getResolvedTargetSlots();
        const panel = this.add.rectangle(0, difficultyLevel === 3 ? 0 : -16, difficultyLevel === 3 ? 560 : 500, difficultyLevel === 3 ? 340 : 290, 0xfff5d6)
            .setStrokeStyle(6, 0x7f5a2d)
            .setDepth(10);
        const label = this.addGameText(0, -124, `Build the ${this.target.name}`, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 24,
            color: '#7f4c1c',
            stroke: '#fff6df',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        this.visualObjects.push(panel, label);

        if (difficultyLevel === 3) {
        resolvedSlots.forEach((slot) => {
                const silhouette = this.createPieceVisual(
                    slot.kind,
                    slot.x,
                    slot.y,
                    slot.scale * 1.14,
                    slot.angle,
                    0xe0bc7b,
                    1
                );
                silhouette.setDepth(14);
                silhouette.setStrokeStyle(0, 0x000000, 0);
                this.visualObjects.push(silhouette);
            });
        }

        resolvedSlots.forEach((slot, index) => {
            if (difficultyLevel !== 3) {
            const outline = this.createPieceVisual(
                slot.kind,
                slot.x,
                slot.y,
                slot.scale,
                slot.angle,
                difficultyLevel === 3 ? 0xe8cb95 : 0xffedd5,
                difficultyLevel === 3 ? 0.98 : 0.28
            );
            outline.setDepth(16);
            outline.setStrokeStyle(difficultyLevel === 3 ? 0 : 4, 0x9a6b39);
            this.visualObjects.push(outline);
            }

            const bounds = this.getPieceBounds(slot.kind, slot.scale, slot.angle);
            const dropZone = this.add.rectangle(slot.x, slot.y, bounds.width, bounds.height, 0xffffff, 0.001)
                .setInteractive({ dropZone: true })
                .setDepth(18);
            this.visualObjects.push(dropZone);
            this.placementSlots.push({
                index,
                kind: slot.kind,
                x: slot.x,
                y: slot.y,
                angle: slot.angle,
                scale: slot.scale,
                filled: false,
                dropZone
            });
        });
    }

    renderChoices ()
    {
        const difficultyLevel = this.getDifficultyLevel();
        const sourceSlots = Phaser.Utils.Array.Shuffle(this.getSourcePieces());

        if (difficultyLevel === 3) {
            const leftTray = this.add.rectangle(-366, 106, 154, 500, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setDepth(10);
            const rightTray = this.add.rectangle(366, 106, 154, 500, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setDepth(10);
            const trayLabel = this.addGameText(0, 244, 'Drag the pieces from the sides', {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 24,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(20);
            this.visualObjects.push(leftTray, rightTray, trayLabel);
        } else {
            const tray = this.add.rectangle(0, GameScene.VISUAL_OPTION_Y, 760, 136, 0xfff7e3)
                .setStrokeStyle(6, 0x8f5f2e)
                .setDepth(10);
            const trayLabel = this.addGameText(0, GameScene.VISUAL_OPTION_Y - 70, 'Drag the pieces into the shape', {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 24,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(20);
            this.visualObjects.push(tray, trayLabel);
        }

        sourceSlots.forEach((slot, index) => {
            const homePoint = this.getChoiceHomePoint(index, sourceSlots.length);
            const homeX = homePoint.x;
            const homeY = homePoint.y;
            const container = this.add.container(homeX, homeY).setDepth(40);
            const pad = this.add.ellipse(0, 34, 110, 42, 0xeecf9c, 0.55).setDepth(39);
            const label = this.addGameText(0, 60, this.getPieceLabel(slot.kind), {
                fontFamily: GameScene.FONT_FAMILY,
                fontSize: 18,
                color: '#8b4d1d',
                stroke: '#fff8e5',
                strokeThickness: 6
            }).setOrigin(0.5);
            label.disableInteractive();
            const previewScale = (difficultyLevel === 3 ? 0.74 : 0.82) * (slot.scale ?? 1);
            const piece = this.createPieceVisual(slot.kind, 0, 0, previewScale, slot.angle ?? 0, 0xffd88c, 1);
            piece.setDepth(42);
            piece.setInteractive({ cursor: 'grab' });

            container.add([pad, piece, label]);
            this.input.setDraggable(piece);

            const choice: PieceChoice = {
                kind: slot.kind,
                container,
                piece,
                targetAngle: slot.angle,
                targetScale: slot.scale,
                previewScale,
                isDistractor: slot.isDistractor,
                homeX,
                homeY: GameScene.VISUAL_OPTION_Y,
                dragOffsetX: 0,
                dragOffsetY: 0,
                used: false
            };

            piece.on('dragstart', (pointer: Phaser.Input.Pointer) => {
                if (choice.used) {
                    return;
                }
                choice.dragOffsetX = pointer.worldX - container.x;
                choice.dragOffsetY = pointer.worldY - container.y;
                container.setDepth(90);
                container.setScale(1.04);
                this.feedbackText.setText('Drop the piece onto a matching outline.');
            });
            piece.on('drag', (pointer: Phaser.Input.Pointer) => {
                if (choice.used) {
                    return;
                }
                container.x = pointer.worldX - choice.dragOffsetX;
                container.y = pointer.worldY - choice.dragOffsetY;
            });
            piece.on('dragend', (pointer: Phaser.Input.Pointer) => {
                if (choice.used) {
                    return;
                }
                const slot = this.findMatchingSlot(choice, pointer.worldX, pointer.worldY);
                if (slot) {
                    this.placePiece(choice, slot);
                    return;
                }
                this.snapPieceHome(choice);
            });

            this.choicePieces.push(choice);
        });
    }

    getSourcePieces ()
    {
        const targetPieces: SourcePiece[] = this.target.slots.map((slot) => ({
            kind: slot.kind,
            angle: slot.angle ?? 0,
            scale: slot.scale ?? 1,
            isDistractor: false
        }));
        const difficultyLevel = this.getDifficultyLevel();
        const distractorCount = difficultyLevel === 1 ? 1 : difficultyLevel === 2 ? 2 : 3;
        const distractorPool: SourcePiece[] = [
            { kind: 'triangle', angle: 90, scale: 0.82, isDistractor: true },
            { kind: 'triangle', angle: 270, scale: 1.08, isDistractor: true },
            { kind: 'square', angle: 0, scale: 0.78, isDistractor: true },
            { kind: 'square', angle: 0, scale: 1.08, isDistractor: true },
            { kind: 'rectangle', angle: 0, scale: 0.78, isDistractor: true },
            { kind: 'rectangle', angle: 90, scale: 0.78, isDistractor: true },
            { kind: 'rectangle', angle: 90, scale: 1.08, isDistractor: true }
        ];
        const usedKeys = new Set(targetPieces.map((piece) => `${piece.kind}-${piece.angle}-${piece.scale}`));
        const usedVisualKeys = new Set(targetPieces.map((piece) => this.getPieceVisualKey(piece.kind, piece.angle)));
        const distractors = Phaser.Utils.Array.Shuffle(distractorPool).filter((piece) => {
            const key = `${piece.kind}-${piece.angle}-${piece.scale}`;
            const visualKey = this.getPieceVisualKey(piece.kind, piece.angle);
            if (usedKeys.has(key)) {
                return false;
            }
            if (usedVisualKeys.has(visualKey)) {
                return false;
            }
            usedKeys.add(key);
            usedVisualKeys.add(visualKey);
            return true;
        }).slice(0, distractorCount);

        return [...targetPieces, ...distractors];
    }

    getPieceVisualKey (kind: PieceKind, angle: number)
    {
        if (kind === 'square') {
            return 'square';
        }

        const normalizedAngle = ((angle % 360) + 360) % 360;

        if (kind === 'rectangle') {
            return normalizedAngle % 180 === 90 ? 'rectangle-vertical' : 'rectangle-horizontal';
        }

        return `triangle-${normalizedAngle}`;
    }

    getChoiceHomePoint (index: number, total: number)
    {
        if (this.getDifficultyLevel() !== 3) {
            const spacing = total === 1 ? 0 : Math.min(132, 620 / Math.max(1, total - 1));
            const startX = -((total - 1) * spacing) / 2;
            return {
                x: startX + index * spacing,
                y: GameScene.VISUAL_OPTION_Y
            };
        }

        const leftCount = Math.ceil(total / 2);
        const isLeft = index < leftCount;
        const columnIndex = isLeft ? index : index - leftCount;

        return {
            x: isLeft ? -366 : 366,
            y: -84 + columnIndex * 84
        };
    }

    placePiece (choice: PieceChoice, slot: PiecePlacementSlot)
    {
        if (choice.used) {
            return;
        }

        if (
            slot.filled
            || choice.isDistractor
            || slot.kind !== choice.kind
            || slot.angle !== choice.targetAngle
            || slot.scale !== choice.targetScale
        ) {
            this.markAdaptiveRoundMistake();
            this.sfx.get('incorrect')?.play();
            this.feedbackText.setText('That piece does not fit.');
            this.cameras.main.shake(180, 0.002);
            this.snapPieceHome(choice);
            return;
        }

        choice.used = true;
        slot.filled = true;
        choice.piece.disableInteractive();
        this.input.setDraggable(choice.piece, false);

        this.tweens.add({
            targets: choice.container,
            x: slot.x,
            y: slot.y,
            duration: 180,
            ease: 'Sine.easeOut',
            onComplete: () => {
                choice.container.setDepth(24);
                choice.container.setScale(choice.targetScale / choice.previewScale);
                choice.container.list.forEach((gameObject) => {
                    if (gameObject !== choice.piece && 'setVisible' in gameObject) {
                        (gameObject as Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => void }).setVisible(false);
                    }
                });
            }
        });

        if (this.placementSlots.every((entry) => entry.filled)) {
            const adaptiveResult = this.completeAdaptiveRound();
            const nextRoundDelay = this.playAdaptiveCelebration(adaptiveResult, 900);
            this.sfx.get('correct')?.play();
            this.feedbackText.setText(`You built the ${this.target.name}.`);
            this.time.delayedCall(nextRoundDelay, () => {
                this.generateRound();
            });
            return;
        }

        this.feedbackText.setText('Keep building.');
        this.time.delayedCall(350, () => {
            this.feedbackText.setText('');
        });
    }

    findMatchingSlot (choice: PieceChoice, worldX: number, worldY: number)
    {
        const candidates = this.placementSlots.filter((slot) =>
            !slot.filled
            && slot.kind === choice.kind
            && slot.angle === choice.targetAngle
            && slot.scale === choice.targetScale
        );

        let bestMatch: PiecePlacementSlot | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        candidates.forEach((slot) => {
            const bounds = this.getPieceBounds(slot.kind, slot.scale, slot.angle);
            const dx = Math.abs(worldX - slot.x);
            const dy = Math.abs(worldY - slot.y);
            if (dx > bounds.width / 2 || dy > bounds.height / 2) {
                return;
            }

            const distance = dx + dy;
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = slot;
            }
        });

        return bestMatch;
    }

    snapPieceHome (choice: PieceChoice)
    {
        this.tweens.add({
            targets: choice.container,
            x: choice.homeX,
            y: choice.homeY,
            duration: 180,
            ease: 'Sine.easeOut',
            onComplete: () => {
                choice.container.setDepth(40);
                choice.container.setScale(1);
                this.feedbackText.setText('');
            }
        });
    }

    createPieceVisual (
        kind: PieceKind,
        x: number,
        y: number,
        scale: number,
        angle: number,
        fillColor: number,
        fillAlpha: number
    ) {
        if (kind === 'square') {
            return this.add.rectangle(x, y, 72 * scale, 72 * scale, fillColor)
                .setFillStyle(fillColor, fillAlpha)
                .setStrokeStyle(5, 0x8f5f2e)
                .setAngle(angle);
        }

        if (kind === 'rectangle') {
            return this.add.rectangle(x, y, 96 * scale, 54 * scale, fillColor)
                .setFillStyle(fillColor, fillAlpha)
                .setStrokeStyle(5, 0x8f5f2e)
                .setAngle(angle);
        }

        return this.add.triangle(x, y, 0, 72 * scale, 36 * scale, 0, 72 * scale, 72 * scale, fillColor)
            .setFillStyle(fillColor, fillAlpha)
            .setStrokeStyle(5, 0x8f5f2e)
            .setAngle(angle);
    }

    getResolvedTargetSlots ()
    {
        const resolved: ResolvedPieceSlot[] = this.target.slots.map((slot) => ({
            kind: slot.kind,
            x: slot.x,
            y: slot.y,
            angle: slot.angle ?? 0,
            scale: slot.scale ?? 1
        }));

        const originalCenter = resolved.reduce((accumulator, slot) => ({
            x: accumulator.x + slot.x,
            y: accumulator.y + slot.y
        }), { x: 0, y: 0 });
        originalCenter.x /= Math.max(1, resolved.length);
        originalCenter.y /= Math.max(1, resolved.length);

        const difficultyLevel = this.getDifficultyLevel();
        const minGap = difficultyLevel === 1 ? -4 : difficultyLevel === 2 ? -6 : -10;
        for (let iteration = 0; iteration < 48; iteration += 1) {
            let moved = false;

            for (let index = 0; index < resolved.length; index += 1) {
                for (let compareIndex = index + 1; compareIndex < resolved.length; compareIndex += 1) {
                    const first = resolved[index];
                    const second = resolved[compareIndex];
                    const firstBounds = this.getPieceBounds(first.kind, first.scale, first.angle);
                    const secondBounds = this.getPieceBounds(second.kind, second.scale, second.angle);
                    const deltaX = second.x - first.x;
                    const deltaY = second.y - first.y;
                    const overlapX = (firstBounds.width + secondBounds.width) / 2 + minGap - Math.abs(deltaX);
                    const overlapY = (firstBounds.height + secondBounds.height) / 2 + minGap - Math.abs(deltaY);

                    if (overlapX <= 0 || overlapY <= 0) {
                        continue;
                    }

                    moved = true;

                    if (overlapX < overlapY) {
                        const push = overlapX / 2;
                        const direction = deltaX === 0 ? (index < compareIndex ? 1 : -1) : Math.sign(deltaX);
                        first.x -= direction * push;
                        second.x += direction * push;
                        continue;
                    }

                    const push = overlapY / 2;
                    const direction = deltaY === 0 ? (index < compareIndex ? 1 : -1) : Math.sign(deltaY);
                    first.y -= direction * push;
                    second.y += direction * push;
                }
            }

            if (!moved) {
                break;
            }
        }

        const resolvedCenter = resolved.reduce((accumulator, slot) => ({
            x: accumulator.x + slot.x,
            y: accumulator.y + slot.y
        }), { x: 0, y: 0 });
        resolvedCenter.x /= Math.max(1, resolved.length);
        resolvedCenter.y /= Math.max(1, resolved.length);

        const minimumCompactFactor = difficultyLevel === 1 ? 0.7 : difficultyLevel === 2 ? 0.5 : 0.25;
        const compacted = this.compactTargetSlots(resolved, resolvedCenter, minGap, minimumCompactFactor);

        const compactedCenter = compacted.reduce((accumulator, slot) => ({
            x: accumulator.x + slot.x,
            y: accumulator.y + slot.y
        }), { x: 0, y: 0 });
        compactedCenter.x /= Math.max(1, compacted.length);
        compactedCenter.y /= Math.max(1, compacted.length);

        const offsetX = originalCenter.x - compactedCenter.x;
        const offsetY = originalCenter.y - compactedCenter.y;

        return compacted.map((slot) => ({
            ...slot,
            x: slot.x + offsetX,
            y: slot.y + offsetY
        }));
    }

    compactTargetSlots (slots: ResolvedPieceSlot[], center: { x: number; y: number }, minGap: number, minimumFactor: number)
    {
        let low = minimumFactor;
        let high = 1;
        let best = 1;

        for (let iteration = 0; iteration < 20; iteration += 1) {
            const factor = (low + high) / 2;
            if (this.canCompactSlotsToFactor(slots, center, factor, minGap)) {
                best = factor;
                high = factor;
            } else {
                low = factor;
            }
        }

        return slots.map((slot) => ({
            ...slot,
            x: center.x + (slot.x - center.x) * best,
            y: center.y + (slot.y - center.y) * best
        }));
    }

    canCompactSlotsToFactor (slots: ResolvedPieceSlot[], center: { x: number; y: number }, factor: number, minGap: number)
    {
        const scaledSlots = slots.map((slot) => ({
            ...slot,
            x: center.x + (slot.x - center.x) * factor,
            y: center.y + (slot.y - center.y) * factor
        }));

        for (let index = 0; index < scaledSlots.length; index += 1) {
            for (let compareIndex = index + 1; compareIndex < scaledSlots.length; compareIndex += 1) {
                const first = scaledSlots[index];
                const second = scaledSlots[compareIndex];
                const firstBounds = this.getPieceBounds(first.kind, first.scale, first.angle);
                const secondBounds = this.getPieceBounds(second.kind, second.scale, second.angle);
                const overlapX = (firstBounds.width + secondBounds.width) / 2 + minGap - Math.abs(second.x - first.x);
                const overlapY = (firstBounds.height + secondBounds.height) / 2 + minGap - Math.abs(second.y - first.y);

                if (overlapX > 0 && overlapY > 0) {
                    return false;
                }
            }
        }

        return true;
    }

    getPieceBounds (kind: PieceKind, scale: number, angle = 0)
    {
        if (kind === 'square') {
            return { width: 72 * scale, height: 72 * scale };
        }

        if (kind === 'rectangle') {
            const isVertical = Math.abs(angle % 180) === 90;
            return isVertical
                ? { width: 54 * scale, height: 96 * scale }
                : { width: 96 * scale, height: 54 * scale };
        }

        return { width: 72 * scale, height: 72 * scale };
    }

    getPieceLabel (kind: PieceKind)
    {
        if (kind === 'square') {
            return 'Square';
        }

        if (kind === 'rectangle') {
            return 'Rectangle';
        }

        return 'Triangle';
    }

    clearRound ()
    {
        this.visualObjects.forEach((gameObject) => gameObject.destroy());
        this.visualObjects = [];
        this.choicePieces.forEach((choice) => choice.container.destroy());
        this.choicePieces = [];
        this.placementSlots = [];
    }

    update () {}

    changeScene () {}
}
