import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import {Howl} from 'howler';


export class CountingGameScene extends GameScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    problemText: Phaser.GameObjects.Text;
    eggs: Phaser.GameObjects.Image[];
    solution: number;

    constructor ()
    {
        super('CountingGameScene', "Counting Practice");
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.centerOn(0,0)
        this.camera.setBackgroundColor(0x000000);
        this.bgm.set("gameplay", new Howl({
            src: ['assets/bgm/Song_Candy_Shop_Loop.ogg'],
            autoplay: true,
            loop: true,
            volume: .3
        }));
        this.bgm.set("victory", new Howl({
            src: ['assets/bgm/LOOP_Feel-Good-Victory.ogg'],
            autoplay: false,
            loop: true,
            volume: .5
        }));
        this.sfx.set("correct", new Howl({
            src: ['assets/sfx/correct.ogg'],
            autoplay: false,
            loop: false,
            volume: .5
        }));
        this.sfx.set("incorrect", new Howl({
            src: ['assets/sfx/GAME_MENU_SCORE_SFX000603.ogg'],
            autoplay: false,
            loop: false,
            volume: .5
        }));


        this.background = this.add.image(0,0, 'restaurant');
        this.background.setOrigin(.5, .5);
        this.background.scale = .75;


        this.problemText = this.add.text(0, -150, 'How many chickens do you see?', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.eggs = new Array();
        let scale = .75;
        let spacing = 175;
        let xOffset = -2.5 * spacing * scale;
        let yOffset = -.5 * spacing * scale;
        for(let i = 0; i < 10; i++) {
            this.eggs.push(this.add.sprite((i%5)*spacing*scale + xOffset, Math.floor(i/5)*spacing*scale + yOffset, "chicken").setScale(scale,scale).setOrigin(0, 0));
        }


        for(var i = 0; i < 10; i++) {
            this.addButton(i+1, (i%10 - 4.5) * 90, 250+Math.floor(i/10) * 90);
        }

        //this.input?.keyboard?.on('keyup', this.handleKeyboardInput, this);
        this.generateProblem();
        EventBus.emit('current-scene-ready', this);
    }

    addButton(value: number, x: number, y: number) {
        let button = this.add.sprite(x, y, "button");
        button.setScale(1.5);
        button.setOrigin(.5, .5);
        let text = this.add.text(x, y, `${value}`, {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        });
        text.setOrigin(.5, .5);

        button.setInteractive();
        button.on("pointerup", () => {
            this.submitAnswer(value);
        });

        button.on("pointerover", () => {
            button.setScale(1.6);
        });

        button.on("pointerout", () => {
            button.setScale(1.5);
        });
    }

    handleKeyboardInput(e: KeyboardEvent) {
        let proposedAnswer = parseInt(e.key);
        if(!isNaN(proposedAnswer)) {
            this.submitAnswer(proposedAnswer);
        }
    }

    submitAnswer(proposedAnswer: number) {
        if(proposedAnswer === this.solution) {
            this.sfx.get("correct")?.play();
            setTimeout(() => {
                this.generateProblem();
            }, 500);
        }
        else {
            this.sfx.get("incorrect")?.play();
            this.cameras.main.shake(200, 0.002);
        }
    }

    generateProblem() {
        let newSolution = this.solution;
        while(newSolution === this.solution) {
            newSolution = Math.floor(Math.random()*9)+1;
        }
        this.solution = newSolution;
        for(let i = 0; i < 10; i++) {
            this.eggs[i].setVisible(i < this.solution);
        }
    }

    update(t: number, dt:number) {
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
