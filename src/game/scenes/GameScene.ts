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

type AdaptiveDifficultyState = {
    currentLevel: number;
    masteryProgress: number;
    currentRoundHadMistake: boolean;
};

type DifficultyChangePayload = {
    sceneKey?: string;
    difficultyLevel?: number;
    regenerate?: boolean;
};

type AdaptiveCelebration = {
    title: string;
    message: string;
};

type AdaptiveDifficultyResult = {
    difficultyLevel: number;
    promoted: boolean;
    celebration: AdaptiveCelebration | null;
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
    static readonly LEVEL_UP_CELEBRATION_MIN_DELAY = 1700;
    static readonly LEVEL_UP_CELEBRATION_HOLD_MS = 920;
    static readonly LEVEL_UP_CELEBRATION_NAME = '__level_up_celebration__';
    static readonly LEVEL_UP_THRESHOLDS: Record<number, number> = {
        1: 4,
        2: 6
    };
    title: string;
    bgm: Map<string, Howl>;
    sfx: Map<string, Howl>;

    constructor (key: string, title: string) {
        super(key);
        this.title = title;
        this.bgm = new Map<string, Howl>();
        this.sfx = new Map<string, Howl>();
    }

    static getAdaptiveDifficultyKey (sceneKey: string) {
        return `adaptiveDifficulty:${sceneKey}`;
    }

    static createAdaptiveDifficultyState (level = 1): AdaptiveDifficultyState {
        return {
            currentLevel: Phaser.Math.Clamp(Math.floor(level) || 1, 1, 3),
            masteryProgress: 0,
            currentRoundHadMistake: false
        };
    }

    static readAdaptiveDifficultyState (game: Phaser.Game, sceneKey: string) {
        const key = GameScene.getAdaptiveDifficultyKey(sceneKey);
        return game.registry.get(key) as AdaptiveDifficultyState | undefined;
    }

    static writeAdaptiveDifficultyState (game: Phaser.Game, sceneKey: string, state: AdaptiveDifficultyState) {
        game.registry.set(GameScene.getAdaptiveDifficultyKey(sceneKey), state);
        return state;
    }

    static ensureAdaptiveDifficultyState (game: Phaser.Game, sceneKey: string, level = 1) {
        const existingState = GameScene.readAdaptiveDifficultyState(game, sceneKey);

        if (existingState) {
            return existingState;
        }

        return GameScene.writeAdaptiveDifficultyState(game, sceneKey, GameScene.createAdaptiveDifficultyState(level));
    }

    static resetAdaptiveDifficultyState (game: Phaser.Game, sceneKey: string, level = 1) {
        return GameScene.writeAdaptiveDifficultyState(game, sceneKey, GameScene.createAdaptiveDifficultyState(level));
    }

    static seedAdaptiveDifficultyState (game: Phaser.Game, sceneKey: string, level: number) {
        return GameScene.writeAdaptiveDifficultyState(game, sceneKey, GameScene.createAdaptiveDifficultyState(level));
    }

    getDifficultyLevel () {
        const difficultyState = GameScene.ensureAdaptiveDifficultyState(this.game, this.scene.key);
        return difficultyState.currentLevel;
    }

    getAdaptiveDifficultyState () {
        return GameScene.ensureAdaptiveDifficultyState(this.game, this.scene.key);
    }

    syncDifficultyLevelUI () {
        EventBus.emit('difficulty-level-updated', {
            sceneKey: this.scene.key,
            difficultyLevel: this.getDifficultyLevel()
        });
    }

    seedAdaptiveDifficulty (level: number) {
        GameScene.seedAdaptiveDifficultyState(this.game, this.scene.key, level);
        this.syncDifficultyLevelUI();
    }

    markAdaptiveRoundMistake () {
        const difficultyState = this.getAdaptiveDifficultyState();

        if (difficultyState.currentRoundHadMistake) {
            return;
        }

        difficultyState.currentRoundHadMistake = true;
        difficultyState.masteryProgress = 0;
        GameScene.writeAdaptiveDifficultyState(this.game, this.scene.key, difficultyState);
    }

    completeAdaptiveRound () {
        const difficultyState = this.getAdaptiveDifficultyState();
        let promoted = false;
        let celebration: AdaptiveCelebration | null = null;

        if (!difficultyState.currentRoundHadMistake && difficultyState.currentLevel < 3) {
            difficultyState.masteryProgress += 1;

            const threshold = GameScene.LEVEL_UP_THRESHOLDS[difficultyState.currentLevel] ?? Number.POSITIVE_INFINITY;

            if (difficultyState.masteryProgress >= threshold) {
                difficultyState.currentLevel += 1;
                difficultyState.masteryProgress = 0;
                promoted = true;
                celebration = this.getAdaptiveCelebration(difficultyState.currentLevel);
            }
        }
        else if (difficultyState.currentRoundHadMistake) {
            difficultyState.masteryProgress = 0;
        }

        difficultyState.currentRoundHadMistake = false;
        GameScene.writeAdaptiveDifficultyState(this.game, this.scene.key, difficultyState);
        this.syncDifficultyLevelUI();

        return {
            difficultyLevel: difficultyState.currentLevel,
            promoted,
            celebration
        } satisfies AdaptiveDifficultyResult;
    }

    getAdaptiveCelebration (difficultyLevel: number): AdaptiveCelebration {
        if (difficultyLevel >= 3) {
            return {
                title: 'Level 3 unlocked!',
                message: 'Look how much you have learned!'
            };
        }

        return {
            title: 'Level 2 unlocked!',
            message: 'You are ready for something new!'
        };
    }

    playAdaptiveCelebration (result: AdaptiveDifficultyResult, baseDelayMs: number) {
        if (!result.promoted || !result.celebration) {
            return baseDelayMs;
        }

        const existingCelebration = this.children.getByName(GameScene.LEVEL_UP_CELEBRATION_NAME);
        if (existingCelebration) {
            existingCelebration.destroy();
        }

        const container = this.add.container(0, -66)
            .setDepth(1000)
            .setAlpha(0)
            .setScale(0.86)
            .setName(GameScene.LEVEL_UP_CELEBRATION_NAME);

        const glow = this.add.rectangle(0, 0, 600, 188, 0xffcf65, 0.24)
            .setStrokeStyle(4, 0xfff4c7, 0.45);
        const badge = this.add.rectangle(0, 0, 520, 136, 0xfff7da)
            .setStrokeStyle(6, 0xd37a32);
        const ribbon = this.add.rectangle(0, -46, 220, 40, 0xffa454)
            .setStrokeStyle(4, 0xffe1ad);
        const ribbonText = this.addGameText(0, -46, 'You leveled up!', {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 22,
            color: '#fffdf5',
            stroke: '#9a4f1f',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        const titleText = this.addGameText(0, -4, result.celebration.title, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 34,
            color: '#b45a22',
            stroke: '#fff8e8',
            strokeThickness: 7,
            align: 'center'
        }).setOrigin(0.5);
        const messageText = this.addGameText(0, 38, result.celebration.message, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: 22,
            color: '#6e502f',
            stroke: '#fff8ec',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: 420 }
        }).setOrigin(0.5);

        const confettiDots = [
            this.add.circle(-214, -44, 10, 0xff8f6b, 0.96),
            this.add.circle(-182, -70, 7, 0x76d6ff, 0.96),
            this.add.circle(-156, 50, 8, 0xf6c94a, 0.96),
            this.add.circle(214, -44, 10, 0xff8f6b, 0.96),
            this.add.circle(182, -70, 7, 0x76d6ff, 0.96),
            this.add.circle(156, 50, 8, 0xf6c94a, 0.96)
        ];

        container.add([
            glow,
            badge,
            ribbon,
            ribbonText,
            titleText,
            messageText,
            ...confettiDots
        ]);

        this.tweens.add({
            targets: container,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 240,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: container,
            y: -78,
            duration: 520,
            ease: 'Sine.easeOut',
            yoyo: true
        });

        this.time.delayedCall(GameScene.LEVEL_UP_CELEBRATION_HOLD_MS, () => {
            if (!container.scene) {
                return;
            }

            this.tweens.add({
                targets: container,
                alpha: 0,
                scaleX: 0.94,
                scaleY: 0.94,
                duration: 220,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    container.destroy();
                }
            });
        });

        return Math.max(baseDelayMs, GameScene.LEVEL_UP_CELEBRATION_MIN_DELAY);
    }

    watchDifficultyChanges (onChange: (difficultyLevel: number) => void) {
        const handleDifficultyChanged = (payload?: number | DifficultyChangePayload) => {
            if (typeof payload === 'number') {
                onChange(payload);
                return;
            }

            if (payload?.sceneKey && payload.sceneKey !== this.scene.key) {
                return;
            }

            if (payload?.regenerate === false) {
                return;
            }

            onChange(typeof payload?.difficultyLevel === 'number' ? payload.difficultyLevel : this.getDifficultyLevel());
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
