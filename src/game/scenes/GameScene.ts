import { Scene } from 'phaser';
import {Howl} from 'howler';
import { EventBus } from '../EventBus';
import { CropName, CROP_SPRITESHEET_KEY, getCropFrame } from '../crops';

type AutoFitGameText = Phaser.GameObjects.Text & {
    __gameTextBaseScaleX?: number;
    __gameTextBaseScaleY?: number;
    __gameTextOriginalSetOrigin?: Phaser.GameObjects.Text['setOrigin'];
    __gameTextOriginalSetScale?: Phaser.GameObjects.Text['setScale'];
    __gameTextOriginalSetText?: Phaser.GameObjects.Text['setText'];
};

export class GameScene extends Scene {
    static readonly FONT_FAMILY = "'Pangolin', 'Trebuchet MS', sans-serif";
    static readonly TEXT_RENDER_SCALE = 0.5;
    static readonly TEXT_RESOLUTION = 2;
    static readonly STAGE_WIDTH = 1024;
    static readonly STAGE_HEIGHT = 768;
    static readonly TEXT_SAFE_PADDING = 18;
    static readonly EGG_FILL = 0xffffff;
    static readonly ANSWER_GRID_Y = 220;
    static readonly ANSWER_GRID_COMPACT_Y = 206;
    static readonly ANSWER_ROW_SPACING = 84;
    static readonly ANSWER_ROW_SPACING_COMPACT = 76;
    static readonly VISUAL_OPTION_Y = 248;
    static readonly KEYPAD_Y = 28;
    title: string;
    bgm: Map<string, Howl>;
    sfx: Map<string, Howl>;

    constructor (key: string, title: string) {
        super(key);
        this.title = title;
        this.bgm = new Map<string, Howl>();
        this.sfx = new Map<string, Howl>();
    }

    getDifficultyLevel () {
        const difficultyLevel = Number(this.game.registry.get('difficultyLevel') ?? 1);
        return Phaser.Math.Clamp(Math.floor(difficultyLevel) || 1, 1, 3);
    }

    watchDifficultyChanges (onChange: (difficultyLevel: number) => void) {
        const handleDifficultyChanged = (difficultyLevel?: number) => {
            onChange(typeof difficultyLevel === 'number' ? difficultyLevel : this.getDifficultyLevel());
        };

        EventBus.on('difficulty-changed', handleDifficultyChanged);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('difficulty-changed', handleDifficultyChanged);
        });
    }

    useFixedStageCamera (
        camera: Phaser.Cameras.Scene2D.Camera,
        centerX = 0,
        centerY = 0,
        zoom = 1
    ) {
        camera.setZoom(zoom);
        camera.centerOn(centerX, centerY);
    }

    getBackgroundAssetKey () {
        return 'coop';
    }

    addSceneBackground () {
        const background = this.add.image(0, 0, this.getBackgroundAssetKey());
        background.setDisplaySize(1024, 768);
        return background;
    }

    addCropSprite (x: number, y: number, crop: CropName, frame?: number) {
        return this.add.sprite(x, y, CROP_SPRITESHEET_KEY, frame ?? getCropFrame(crop));
    }

    addGameText (
        x: number,
        y: number,
        text: string | string[],
        style: Phaser.Types.GameObjects.Text.TextStyle
    ) {
        return GameScene.createGameText(this, x, y, text, style);
    }

    static addScaledText (
        scene: Phaser.Scene,
        x: number,
        y: number,
        text: string | string[],
        style: Phaser.Types.GameObjects.Text.TextStyle
    ) {
        return GameScene.createGameText(scene, x, y, text, style);
    }

    static createGameText (
        scene: Phaser.Scene,
        x: number,
        y: number,
        text: string | string[],
        style: Phaser.Types.GameObjects.Text.TextStyle
    ) {
        const scaledStyle = GameScene.scaleTextStyle(style);
        const textObject = scene.add.text(x, y, text, scaledStyle)
            .setResolution(GameScene.TEXT_RESOLUTION)
            .setScale(GameScene.TEXT_RENDER_SCALE);

        return GameScene.enableStageAutoFit(textObject);
    }

    static enableStageAutoFit (textObject: Phaser.GameObjects.Text) {
        const autoFitText = textObject as AutoFitGameText;

        if (autoFitText.__gameTextOriginalSetText) {
            return textObject;
        }

        const originalSetOrigin = textObject.setOrigin.bind(textObject) as Phaser.GameObjects.Text['setOrigin'];
        const originalSetScale = textObject.setScale.bind(textObject) as Phaser.GameObjects.Text['setScale'];
        const originalSetText = textObject.setText.bind(textObject) as Phaser.GameObjects.Text['setText'];

        autoFitText.__gameTextOriginalSetOrigin = originalSetOrigin;
        autoFitText.__gameTextOriginalSetScale = originalSetScale;
        autoFitText.__gameTextOriginalSetText = originalSetText;
        autoFitText.__gameTextBaseScaleX = textObject.scaleX;
        autoFitText.__gameTextBaseScaleY = textObject.scaleY;

        const refit = () => {
            GameScene.refitStageText(autoFitText);
            return textObject;
        };

        textObject.setText = ((value: string | string[]) => {
            originalSetText(value);
            return refit();
        }) as Phaser.GameObjects.Text['setText'];

        textObject.setOrigin = ((x?: number, y?: number) => {
            originalSetOrigin(x, y);
            return refit();
        }) as Phaser.GameObjects.Text['setOrigin'];

        textObject.setScale = ((x?: number, y?: number) => {
            originalSetScale(x, y);
            autoFitText.__gameTextBaseScaleX = textObject.scaleX;
            autoFitText.__gameTextBaseScaleY = textObject.scaleY;
            return refit();
        }) as Phaser.GameObjects.Text['setScale'];

        return refit();
    }

    static refitStageText (textObject: AutoFitGameText) {
        const originalSetScale = textObject.__gameTextOriginalSetScale;

        if (!originalSetScale) {
            return textObject;
        }

        const baseScaleX = textObject.__gameTextBaseScaleX ?? GameScene.TEXT_RENDER_SCALE;
        const baseScaleY = textObject.__gameTextBaseScaleY ?? baseScaleX;

        originalSetScale(baseScaleX, baseScaleY);

        const stageLeft = -GameScene.STAGE_WIDTH / 2 + GameScene.TEXT_SAFE_PADDING;
        const stageRight = GameScene.STAGE_WIDTH / 2 - GameScene.TEXT_SAFE_PADDING;
        const stageTop = -GameScene.STAGE_HEIGHT / 2 + GameScene.TEXT_SAFE_PADDING;
        const stageBottom = GameScene.STAGE_HEIGHT / 2 - GameScene.TEXT_SAFE_PADDING;

        const maxWidth = GameScene.getAxisLimit(textObject.x, textObject.originX, stageLeft, stageRight);
        const maxHeight = GameScene.getAxisLimit(textObject.y, textObject.originY, stageTop, stageBottom);
        const bounds = textObject.getBounds();
        const widthScale = bounds.width > 0 ? maxWidth / bounds.width : 1;
        const heightScale = bounds.height > 0 ? maxHeight / bounds.height : 1;
        const fitScale = Math.min(1, widthScale, heightScale);

        if (fitScale < 1) {
            originalSetScale(baseScaleX * fitScale, baseScaleY * fitScale);
        }

        return textObject;
    }

    static getAxisLimit (position: number, origin: number, min: number, max: number) {
        const negativeSpace = origin > 0 ? (position - min) / origin : Number.POSITIVE_INFINITY;
        const positiveSpace = origin < 1 ? (max - position) / (1 - origin) : Number.POSITIVE_INFINITY;
        return Math.max(1, Math.min(negativeSpace, positiveSpace));
    }

    static scaleTextStyle (style: Phaser.Types.GameObjects.Text.TextStyle) {
        const scaledStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            ...style
        };

        const scaleNumber = (value?: number | string | null) => {
            if (typeof value === 'number') {
                return value * 2;
            }

            if (typeof value === 'string') {
                const numericValue = Number(value);
                if (!Number.isNaN(numericValue)) {
                    return `${numericValue * 2}`;
                }

                const match = value.match(/^(\d+(?:\.\d+)?)(px)?$/);
                if (match) {
                    return `${Number(match[1]) * 2}${match[2] ?? ''}`;
                }
            }

            return value ?? undefined;
        };

        scaledStyle.fontSize = scaleNumber(style.fontSize);
        scaledStyle.strokeThickness = typeof style.strokeThickness === 'number'
            ? style.strokeThickness * 2
            : style.strokeThickness;
        scaledStyle.shadow = style.shadow ? {
            ...style.shadow,
            blur: typeof style.shadow.blur === 'number' ? style.shadow.blur * 2 : style.shadow.blur,
            offsetX: typeof style.shadow.offsetX === 'number' ? style.shadow.offsetX * 2 : style.shadow.offsetX,
            offsetY: typeof style.shadow.offsetY === 'number' ? style.shadow.offsetY * 2 : style.shadow.offsetY,
            stroke: style.shadow.stroke,
            fill: style.shadow.fill,
            color: style.shadow.color
        } : style.shadow;
        scaledStyle.wordWrap = style.wordWrap ? {
            ...style.wordWrap,
            width: typeof style.wordWrap.width === 'number' ? style.wordWrap.width * 2 : style.wordWrap.width
        } : style.wordWrap;
        scaledStyle.padding = style.padding ? {
            left: (style.padding.left ?? 0) * 2,
            right: (style.padding.right ?? 0) * 2,
            top: (style.padding.top ?? 0) * 2,
            bottom: (style.padding.bottom ?? 0) * 2
        } : style.padding;

        return scaledStyle;
    }

    startScene (key: string) {
        this.bgm.forEach((value: Howl, key: string) => {
            value.stop();
        });
        this.sfx.forEach((value: Howl, key: string) => {
            value.stop();
        });
        this.scene.start(key);
    }
}
