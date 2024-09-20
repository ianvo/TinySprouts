import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import {Howl} from 'howler';


export class PatternGameScene extends GameScene
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
        super('PatternGameScene', "Pattern Practice");
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.centerOn(0,0)
        this.camera.setBackgroundColor(0x000000);
        this.bgm.set("gameplay", new Howl({
            src: ['assets/bgm/Sweet Treats.ogg'],
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
        let diff = Math.floor(Math.random() * 4);
        let currentVal = Math.floor(Math.random() * 10);
        this.problem = "";
        for (var i = 0; i < 4; i++) {
            this.problem += `${currentVal}  `;
            currentVal += diff;
        }
        this.solution = currentVal;
        this.answering = true;
    }

    update(t: number, dt:number) {
        if(this.answering) {
            if(this.proposedAnswer === "") {
                this.problemText.text = `${this.problem}_?_`;
            }
            else {
                this.problemText.text = `${this.problem}_${this.proposedAnswer}_`;
            }
        }
    }

    changeScene ()
    {
    }
}
