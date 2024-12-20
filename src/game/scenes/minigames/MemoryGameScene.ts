import { EventBus } from '../../EventBus';
import { GameScene } from '../GameScene';
import {Howl} from 'howler';
import { Scene } from 'phaser';



class Card {
    static WIDTH: number = 140;
    static HEIGHT: number = 190;
    value: number;
    x: number;
    y: number;
    scene: MemoryGameScene;
    valueText: Phaser.GameObjects.Text;
    front: Phaser.GameObjects.Sprite;
    back: Phaser.GameObjects.Sprite;
    width: number;
    height: number;
    
    constructor(scene: MemoryGameScene, value: number, suit:String, x: number, y: number) {
        this.value = value;
        this.x = x;
        this.y = y;
        this.scene = scene;
        
        this.front = this.scene.add.sprite(x, y, `card_${suit}_${value}`);
        this.back = this.scene.add.sprite(x, y, 'card_back');
        /*this.valueText = this.scene.add.text(x, y, `${value}`, {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);*/
        this.front.alpha = 0;
        this.front.scaleX = 0;
        this.front.scaleY = 1.1;
        /*this.valueText.alpha = 0;
        this.valueText.scaleX = 0;
        this.valueText.scaleY = 1.1;*/

        this.back.on("pointerup", this.show, this);
        this.setInteractive();
    }

    setInteractive() {
        this.back.setInteractive();
        this.front.setInteractive();
    }

    disableInteractive() {
        this.back.disableInteractive();
        this.front.disableInteractive();
    }

    show() {
        this.disableInteractive();

        this.scene.tweens.add({
            targets: this.back,
            alpha: 0,
            scaleX: 0,
            scaleY: 1.1,
            duration: 100,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: [this.front],//, this.valueText],
                    alpha: 1,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100,
                    onComplete: () => {
                        this.setInteractive();
                        this.scene.select(this);
                    }
                });
            }
        });
    }

    hide() {
        this.disableInteractive();

        setTimeout(() => {
            this.scene.tweens.add({
                targets: [this.front],//, this.valueText],
                alpha: 0,
                scaleX: 0,
                scaleY: 1.1,
                duration: 100,
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: this.back,
                        alpha: 1,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 100,
                        onComplete: () => {
                            this.setInteractive();
                        }
                    });
                }
            });
        }, 1000);
    }

    destroy() {
        setTimeout(() => {
            this.front.destroy();
            this.back.destroy();
            //this.valueText.destroy();
        }, 1000);
    }
}

export class MemoryGameScene extends GameScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    problemText: Phaser.GameObjects.Text;
    solutionText: Phaser.GameObjects.Text;
    problem: string;
    solution: number;
    proposedAnswer: string;
    answering: boolean;
    cards: Array<Card>;

    selectedCards: Array<Card>;

    constructor ()
    {
        super('MemoryGameScene', "Memory Practice");
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


        this.background = this.add.image(-90, 100, 'cafeteria');

        this.problemText = this.add.text(0, -300, 'Find pairs that add up to 10!', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);


        this.problemText = this.add.text(0, 0, '', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.cards = [];
        this.selectedCards = [];
        this.generateBoard();
        EventBus.emit('current-scene-ready', this);

    }


    generateBoard() {

        let numbers: Array<{value:number,suit:String}> = [];

        for(let i = 2; i <= 8; i++) {
            let suit = ["clubs","diamonds","hearts","spades"][Math.floor(Math.random()*4)];
            numbers.push({
                value:i,
                suit:suit});
            numbers.push({
                value:i,
                suit:suit});
        }

        //shuffle
        for (let i = numbers.length - 1; i > 0; i--) { 
            const j = Math.floor(Math.random() * (i + 1)); 
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]]; 
        } 

        let max = 6;
        for(let i = 0; i < numbers.length; i++) {
            let x = i % max - (max/2 - .5);
            let y = Math.floor(i / max);
            let card = new Card(this, numbers[i].value, numbers[i].suit, x*(Card.WIDTH+10), y*(Card.HEIGHT+10)-150);
        }

    }

    select (card: Card) {
        this.selectedCards.push(card);

        if(this.selectedCards.length === 2) {
            if(this.selectedCards[0].value + this.selectedCards[1].value === 10) {
                this.selectedCards[0].destroy();
                this.selectedCards[1].destroy();
                this.sfx.get("correct")?.play();
            }
            else {
                this.selectedCards[0].hide();
                this.selectedCards[1].hide();
                //this.sfx.get("incorrect")?.play();
            }
            this.selectedCards = [];
        }
    }

    update(t: number, dt:number) {
    }

    changeScene ()
    {
    }
}
