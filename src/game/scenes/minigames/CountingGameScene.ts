import { EventBus } from '../../EventBus';
import {Howl, Howler} from 'howler';
import { MiniGameScene } from './MiniGameScene';


export class CountingGameScene extends MiniGameScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    problemText: Phaser.GameObjects.Text;
    solutionText: Phaser.GameObjects.Text;
    problem: string;
    solution: number;
    proposedAnswer: string;
    answering: boolean;
    bgm: Map<string, Howl>;
    sfx: Map<string, Howl>;

    constructor ()
    {
        super('AdditionGameScene', "Addition Practice");
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.centerOn(0,0)
        this.camera.setBackgroundColor(0x000000);
        this.bgm = new Map<string, Howl>([
            ["gameplay", new Howl({
                src: ['assets/bgm/Theme_1_NewDayEnergy_Loop.ogg'],
                autoplay: true,
                loop: true,
                volume: .3
            })],
            ["victory", new Howl({
                src: ['assets/bgm/LOOP_Feel-Good-Victory.ogg'],
                autoplay: false,
                loop: true,
                volume: .5
            })]
        ]);
        this.sfx = new Map<string, Howl>([
            ["correct", new Howl({
                src: ['assets/sfx/correct.ogg'],
                autoplay: false,
                loop: false,
                volume: .5
            })],
            ["incorrect", new Howl({
                src: ['assets/sfx/incorrect.ogg'],
                autoplay: false,
                loop: false,
                volume: .5
            })]
        ]);


        this.background = this.add.image(0, 0, 'background');
        this.background.setAlpha(0.5);

        this.problemText = this.add.text(0, 0, '', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);


        this.problemText = this.add.text(0, 0, '', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);


        this.input?.keyboard?.on('keyup', this.handleKeyboardInput, this);
        this.generateProblem();
        EventBus.emit('current-scene-ready', this);
    }

    handleKeyboardInput(e: KeyboardEvent) {
        if(e.key === "Enter") {
            if(this.proposedAnswer !== "") {
                this.submitAnswer();
            }
        }
        else if(e.key === "Backspace") {
            this.proposedAnswer = this.proposedAnswer.slice(0, -1);
        }
        else {
            let number = parseInt(e.key);
            if(!isNaN(number)) {
                this.proposedAnswer += e.key;
            }
        }
    }

    submitAnswer() {
        if(parseInt(this.proposedAnswer) === this.solution) {
            this.answering = false;
            this.problemText.text = "That's right!";
            this.sfx.get("correct")?.play();
            setTimeout(() => {
                this.generateProblem();
            }, 1000);
        }
        else {
            this.proposedAnswer = "";
            this.sfx.get("incorrect")?.play();
            this.cameras.main.shake(200, 0.005);
        }
    }

    generateProblem() {
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
                this.problemText.text = `${this.problem} = _`;
            }
            else {
                this.problemText.text = `${this.problem} = ${this.proposedAnswer}`;
            }
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
