import { GameScene } from '../GameScene';

type NumericKeypadConfig = {
    scene: Phaser.Scene;
    x: number;
    y: number;
    onDigit: (digit: string) => void;
    onBackspace?: () => void;
    onSubmit: () => void;
};

export class NumericKeypad {
    static readonly COLUMN_SPACING = 120;
    static readonly ROW_SPACING = 84;
    scene: Phaser.Scene;
    root: Phaser.GameObjects.Container;
    enabled: boolean;
    keyboardHandler: (event: KeyboardEvent) => void;

    constructor({ scene, x, y, onDigit, onBackspace, onSubmit }: NumericKeypadConfig) {
        this.scene = scene;
        this.root = this.scene.add.container(x, y).setDepth(100);
        this.enabled = true;

        const rows = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['DEL', '0', 'OK']
        ];

        rows.forEach((row, rowIndex) => {
            row.forEach((label, columnIndex) => {
                const button = this.createButton(
                    -NumericKeypad.COLUMN_SPACING + columnIndex * NumericKeypad.COLUMN_SPACING,
                    rowIndex * NumericKeypad.ROW_SPACING,
                    label,
                    () => {
                        if (!this.enabled) {
                            return;
                        }

                        if (label === 'DEL') {
                            if (onBackspace) {
                                onBackspace();
                            }
                            return;
                        }

                        if (label === 'OK') {
                            onSubmit();
                            return;
                        }

                        onDigit(label);
                    }
                );

                this.root.add(button);
            });
        });

        this.keyboardHandler = (event: KeyboardEvent) => {
            if (!this.enabled) {
                return;
            }

            if (/^\d$/.test(event.key)) {
                onDigit(event.key);
                return;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                if (onBackspace) {
                    onBackspace();
                }
                return;
            }

            if (event.key === 'Enter') {
                onSubmit();
            }
        };

        this.scene.input.keyboard?.on('keydown', this.keyboardHandler);
    }

    createButton(x: number, y: number, label: string, onPress: () => void) {
        const container = this.scene.add.container(x, y);
        const sprite = this.scene.add.sprite(0, 0, 'button');
        sprite.setScale(label.length > 1 ? 1.96 : 1.62);
        sprite.setOrigin(0.5, 0.5);
        sprite.setInteractive({ cursor: 'pointer' });
        const text = GameScene.addScaledText(this.scene, 0, 0, label, {
            fontFamily: GameScene.FONT_FAMILY,
            fontSize: label.length > 1 ? 20 : 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5, 0.5);
        text.disableInteractive();

        container.add([sprite, text]);
        sprite.on('pointerup', onPress);
        sprite.on('pointerover', () => {
            if (this.enabled) {
                container.setScale(1.06);
            }
        });
        sprite.on('pointerout', () => {
            container.setScale(1);
        });

        return container;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.root.setAlpha(enabled ? 1 : 0.6);
    }

    destroy() {
        this.scene.input.keyboard?.off('keydown', this.keyboardHandler);
        this.root.destroy(true);
    }
}
