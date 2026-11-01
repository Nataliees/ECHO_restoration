import { PrologueRadio } from './prologue-radio.js';
import { TypingSound } from './typing-sound.js';
export const prologueParagraphs = [
    '2144 год.\nЧеловеческая память больше не считается достоверным свидетельством.',
    'В закрытом исследовательском комплексе группа учёных разрабатывает ECHO — систему восстановления воспоминаний, утраченных после тяжёлых травм.',
    'Первые испытания требуют мощности отдельного реактора.',
    'За стабильность реактора отвечает главный инженер комплекса.\nСегодня он рассчитывает закончить испытание вовремя и вернуться к семье.'
];

export class PrologueSequence {
    constructor(game) {
        this.game=game;this.active=false;this.sound=new TypingSound(game);this.radio=new PrologueRadio(game);
        this.screen=document.getElementById('prologue-screen');
        this.screen.setAttribute('aria-label','Предыстория ECHO. '+prologueParagraphs.join(' '));
        this.text=document.getElementById('prologue-text');
        const reserve=document.getElementById('prologue-reserve');
        for(const paragraph of prologueParagraphs){const p=document.createElement('p');p.textContent=paragraph;reserve.appendChild(p);}
        document.getElementById('prologue-skip').addEventListener('click',()=>this.skip());
    }
    start(){
        this.stop();this.active=true;this.index=0;this.offset=0;this.remaining=.55;this.phase='typing';
        document.getElementById('prologue-skip').textContent='Пропустить текст';
        this.text.replaceChildren();this.paragraph=document.createElement('p');this.text.appendChild(this.paragraph);
        this.screen.classList.add('active');document.body.classList.add('intro-active');
    }
    update(dt){
        this.radio.update();
        if(!this.active || document.hidden || !this.sound.ready || !this.radio.ready)return;
        if(this.phase==='radio-loading'){this.beginRadio();return;}
        if(this.phase==='radio')return;
        this.remaining-=dt;
        while(this.remaining<=0&&this.active){
            const source=prologueParagraphs[this.index];
            if(this.offset<source.length){
                const letter=source[this.offset++];this.paragraph.textContent=source.slice(0,this.offset);
                this.sound.strike(letter);
                if(this.index===prologueParagraphs.length-1 && this.offset===source.length){this.beginRadio();return;}
                this.remaining+=letter==='\n'?.35:/[.!?]/.test(letter)?.26:/[,—]/.test(letter)?.15:.055+((this.offset*7+this.index*3)%5)*.006;
            }else if(this.index<prologueParagraphs.length-1){
                this.index++;this.offset=0;this.paragraph=document.createElement('p');this.text.appendChild(this.paragraph);this.remaining+=.7;
            }else{this.beginRadio();return;}
        }
    }
    stop(){this.radio.stop();this.sound.stop();this.active=false;this.reading=false;this.screen?.classList.remove('active');document.body.classList.remove('intro-active');}
    beginRadio(){
        if(!this.radio.ready){this.phase='radio-loading';this.reading=true;return;}
        this.phase='radio';this.reading=true;
        document.getElementById('prologue-skip').textContent='К интро';
        this.radio.play(()=>this.finish());
    }
    skip(){
        if(!this.active)return;
        if(this.phase==='radio'||this.phase==='radio-loading'){this.finish();return;}
        this.sound.stop();this.text.replaceChildren();
        for(const paragraph of prologueParagraphs){const p=document.createElement('p');p.textContent=paragraph;this.text.appendChild(p);}
        this.beginRadio();
    }
    finish(){if(!this.active)return;this.stop();this.game._startIntroVideo();}
}
