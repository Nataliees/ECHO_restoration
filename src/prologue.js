export const prologueParagraphs = [
    '2144 год.\nЧеловеческая память больше не считается достоверным свидетельством.',
    'В закрытом исследовательском комплексе группа учёных разрабатывает ECHO — систему восстановления воспоминаний, утраченных после тяжёлых травм.',
    'Первые испытания требуют мощности отдельного реактора.',
    'За стабильность реактора отвечает главный инженер комплекса.\nСегодня он рассчитывает закончить испытание вовремя и вернуться к семье.'
];

export class PrologueSequence {
    constructor(game) {
        this.game=game;this.active=false;
        this.screen=document.getElementById('prologue-screen');
        this.screen.setAttribute('aria-label','Предыстория ECHO. '+prologueParagraphs.join(' '));
        this.text=document.getElementById('prologue-text');
        const reserve=document.getElementById('prologue-reserve');
        for(const paragraph of prologueParagraphs){const p=document.createElement('p');p.textContent=paragraph;reserve.appendChild(p);}
        document.getElementById('prologue-skip').addEventListener('click',()=>this.finish());
    }
    start(){
        this.stop();this.active=true;this.index=0;this.offset=0;this.remaining=.55;
        this.text.replaceChildren();this.paragraph=document.createElement('p');this.text.appendChild(this.paragraph);
        this.screen.classList.add('active');document.body.classList.add('intro-active');
    }
    update(dt){
        if(!this.active || document.hidden)return;
        this.remaining-=dt;
        while(this.remaining<=0&&this.active){
            const source=prologueParagraphs[this.index];
            if(this.offset<source.length){
                const letter=source[this.offset++];this.paragraph.textContent=source.slice(0,this.offset);
                this.remaining+=letter==='\n'?.35:/[.!?]/.test(letter)?.26:/[,—]/.test(letter)?.1:.032;
            }else if(this.index<prologueParagraphs.length-1){
                this.index++;this.offset=0;this.paragraph=document.createElement('p');this.text.appendChild(this.paragraph);this.remaining+=.7;
            }else{
                // A final reading pause before the original cinematic.
                if(!this.reading){this.reading=true;this.remaining+=2.2;}else this.finish();
            }
        }
    }
    stop(){this.active=false;this.reading=false;this.screen?.classList.remove('active');document.body.classList.remove('intro-active');}
    finish(){if(!this.active)return;this.stop();this.game._startIntroVideo();}
}
