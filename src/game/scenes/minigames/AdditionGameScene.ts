import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import {Howl} from 'howler';


export class AdditionGameScene extends GameScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    problemText: Phaser.GameObjects.Text;
    solutionText: Phaser.GameObjects.Text;
    problem: string;
    solution: number;
    proposedAnswer: string;
    answering: boolean;

    constructor ()
    {
        super('AdditionGameScene', "Addition Practice");
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.centerOn(0,0)
        this.camera.setBackgroundColor(0x000000);
        this.bgm.set("gameplay", new Howl({
            src: ['assets/bgm/Theme_5_PartyTime_Loop.ogg'],
            autoplay: true,
            loop: true,
            volume: .3,
            html5: true
        }));
        this.bgm.set("victory", new Howl({
            src: ['assets/bgm/LOOP_Feel-Good-Victory.ogg'],
            autoplay: false,
            loop: true,
            volume: .5
        }));
        this.sfx.set("correct", new Howl({
            src: ['assets/sfx/Jingle_CorrectAnswer.ogg'],
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


        this.background = this.add.image(-90, 100, 'classroom');

        this.problemText = this.add.text(0, -110, '', {
            fontFamily: 'Arial Black', fontSize: 68, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);


        for(var i = 0; i < 20; i++) {
            this.addButton(i+1, (i%10 - 4.5) * 90, 100+Math.floor(i/10) * 90);
        }


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


    submitAnswer(answer: number) {
        if(answer === this.solution) {
            this.answering = false;
            this.problemText.text = "That's right!";
            this.sfx.get("correct")?.play();
            setTimeout(() => {
                this.generateProblem();
            }, 1000);
        }
        else {
            this.sfx.get("incorrect")?.play();
            this.cameras.main.shake(200, 0.002);
        }
    }

    generateProblem() {
        /*
            Level 1: sums up to 10
            Level 2: sums up to 20
            Level 3: 
        */
        this.proposedAnswer = "";
        let a = Math.floor(Math.random()*10)+1;
        let b = Math.floor(Math.random()*10)+1;
        this.problem = `${a} + ${b}`;
        this.solution = a+b;
        this.answering = true;
    }

    update(t: number, dt:number) {
        if(this.answering) {
            if(this.proposedAnswer === "") {
                this.problemText.text = `${this.problem}`;
            }
            else {
                this.problemText.text = `${this.problem} = ${this.proposedAnswer}`;
            }
        }
    }

    changeScene ()
    {
    }
}
