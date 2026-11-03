// User-supplied background track. Never plays over the prologue or cinematic.
const GAME_STATES=new Set(['play','dialog','journal','memory','choice','ending']);
export const BACKGROUND_MUSIC_VOLUME = .14;
export class BackgroundMusic {
    constructor(game, options={}){
        this.game=game;this.isMenu=!!options.menu;
        this.audio=new Audio(options.src || './assets/background_music.mp3');
        this.audio.loop=true;this.audio.preload='none';this.audio.volume=0;
        this.level=0;this.pending=false;this.blocked=false;
        if(game.audioCtx){
            try{this.source=game.audioCtx.createMediaElementSource(this.audio);this.gain=game.audioCtx.createGain();this.gain.gain.value=0;this.source.connect(this.gain).connect(game.audioCtx.destination);this.audio.volume=1;}catch{/* Native volume remains a supported fallback. */}
        }
        this.unlock=()=>{this.blocked=false;if(this.allowed()){this.game.audioCtx?.resume().catch(()=>{});this.play();}};
        document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();else if(this.allowed())this.play();});
        // Menu navigation consumes E/arrows in capture phase. Unlock the menu
        // track first, using that same real user gesture.
        window.addEventListener('pointerdown',this.unlock,this.isMenu);window.addEventListener('keydown',this.unlock,this.isMenu);
    }
    allowed(){return this.game.soundEnabled && !document.hidden && (this.isMenu ? this.game.state==='menu' : this.game.introSeen && GAME_STATES.has(this.game.state));}
    play(){
        if(this.pending||!this.audio.paused||this.blocked)return;
        this.pending=true;
        this.audio.play().catch(()=>{this.blocked=true;}).finally(()=>{this.pending=false;if(!this.allowed())this.audio.pause();});
    }
    update(dt){
        this.audio.muted=!this.game.soundEnabled;
        if(!this.allowed()){this.pause();return;}
        this.play();
        // Menu and normal gameplay use the same unobtrusive level.
        const target=this.game.state==='memory'?.035:BACKGROUND_MUSIC_VOLUME;
        this.level+=(target-this.level)*(1-Math.exp(-dt*1.2));
        if(this.gain)this.gain.gain.value=this.level;else this.audio.volume=this.level;
    }
    pause(){this.audio.pause();this.level=0;if(this.gain)this.gain.gain.value=0;else this.audio.volume=0;}
    reset(){this.pause();this.blocked=false;try{this.audio.currentTime=0;}catch{}}
}
