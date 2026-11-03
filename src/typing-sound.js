let keyData;
export async function preloadTypingSound(){
    const response=await fetch(new URL('../assets/typewriter-keys.wav',import.meta.url));
    if(!response.ok)throw new Error('Could not load typewriter key samples');
    keyData=await response.arrayBuffer();
}

export class TypingSound {
    constructor(game){
        this.game=game;this.nodes=new Set();this.count=0;this.ready=!game.audioCtx||!keyData;
        if(!this.ready)game.audioCtx.decodeAudioData(keyData.slice(0)).then(buffer=>{this.buffer=buffer;}).catch(error=>console.warn('Typewriter audio unavailable',error)).finally(()=>{this.ready=true;});
    }
    strike(letter){
        if(!this.buffer||!this.game.soundEnabled||document.hidden||/\s/.test(letter))return;
        const ctx=this.game.audioCtx;
        if(ctx.state!=='running')return;
        const source=ctx.createBufferSource(),gain=ctx.createGain(),now=ctx.currentTime;
        source.buffer=this.buffer;
        gain.gain.setValueAtTime(.44+(this.count%3)*.025,now);
        gain.gain.setValueAtTime(.44+(this.count%3)*.025,now+.064);
        gain.gain.linearRampToValueAtTime(0,now+.072);
        source.connect(gain).connect(ctx.destination);
        const node={source,gain};this.nodes.add(node);
        source.onended=()=>{this.nodes.delete(node);source.disconnect();gain.disconnect();};
        // The attack is already aligned to offset zero of each 85 ms slot.
        source.start(now,(this.count++%6)*.085,.072);
    }
    stop(){
        const ctx=this.game.audioCtx;if(!ctx)return;
        for(const node of this.nodes){node.gain.gain.cancelScheduledValues(ctx.currentTime);node.gain.gain.setTargetAtTime(0,ctx.currentTime,.002);try{node.source.stop(ctx.currentTime+.008);}catch{}}
        this.nodes.clear();this.count=0;
    }
}
