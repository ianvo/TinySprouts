import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import {Howl} from 'howler';


export class CountingGameScene extends GameScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
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
            src: ['assets/bgm/Theme_1_NewDayEnergy_Loop.ogg'],
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
            src: ['assets/sfx/incorrect.ogg'],
            autoplay: false,
            loop: false,
            volume: .5
        }));


        this.problemText = this.add.text(0, -150, 'How many eggs do you see?', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.eggs = new Array();
        let scale = 4;
        let xOffset = -2.5 * 30 * scale;
        let yOffset = -.5 * 30 * scale;
        for(let i = 0; i < 10; i++) {
            this.eggs.push(this.add.sprite((i%5)*30*scale + xOffset, Math.floor(i/5)*30*scale + yOffset, "eggs").setScale(scale,scale).setOrigin(0, 0).setFrame(Math.floor(i/5)*124+13));
        }

        this.input?.keyboard?.on('keyup', this.handleKeyboardInput, this);
        this.generateProblem();
        EventBus.emit('current-scene-ready', this);
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
            this.cameras.main.shake(200, 0.005);
        }
    }

    generateProblem() {
        this.solution = Math.floor(Math.random()*9)+1;
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
