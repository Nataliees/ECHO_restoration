let voiceData;
export async function preloadPrologueRadio(){
    const response=await fetch(new URL('../assets/prologue_daughter.mp3',import.meta.url));
    if(!response.ok)throw new Error('Could not load daughter radio prelude');
    voiceData=await response.arrayBuffer();
}

// Uses the same radio band, saturation, quantization and flutter as intro "Daddy?".
export class PrologueRadio {
    constructor(game){
        this.game=game;this.nodes=[];this.active=false;this.captionTimers=[];
        document.addEventListener('visibilitychange',()=>this.update());this.ready=!game.audioCtx||!voiceData;
        if(!this.ready)game.audioCtx.decodeAudioData(voiceData.slice(0)).then(buffer=>{this.buffer=buffer;}).catch(error=>console.warn('Radio prelude unavailable',error)).finally(()=>{this.ready=true;});
    }
    noise(start,duration,volume){
        const ctx=this.game.audioCtx,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
        let seed=519;
        for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1);}
        const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
        source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1850;filter.Q.value=.75;
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.setValueAtTime(volume,start+duration-.035);gain.gain.linearRampToValueAtTime(0,start+duration);
        source.connect(filter).connect(gain).connect(this.master);this.nodes.push(source,filter,gain);source.start(start);return source;
    }
    play(onComplete, options={}){
        this.stop();this.active=true;
        const ctx=this.game.audioCtx;
        if(!ctx||!this.buffer){this.timer=setTimeout(()=>{if(this.active)onComplete();},2400);return;}
        const now=ctx.currentTime,offset=options.full?0:.214,voiceStart=now+.5,voiceEnd=voiceStart+this.buffer.duration-offset;
        this.timeline={textEnd:now,preNoiseStart:now+.22,voiceStart,voiceEnd,postNoiseStart:voiceEnd+.02,introAt:voiceEnd+.26};
        if(options.onVoiceStart){
            this.captionTimers.push(setTimeout(()=>{if(this.active)options.onVoiceStart();},Math.max(0,(voiceStart-now)*1000)));
        }
        if(options.onVoiceEnd){
            this.captionTimers.push(setTimeout(()=>{if(this.active)options.onVoiceEnd();},Math.max(0,(voiceEnd-now)*1000)));
        }
        this.master=ctx.createGain();this.master.gain.value=this.game.soundEnabled?1:0;this.master.connect(ctx.destination);this.nodes.push(this.master);
        const voice=ctx.createBufferSource(),high=ctx.createBiquadFilter(),low=ctx.createBiquadFilter(),saturation=ctx.createWaveShaper(),crush=ctx.createWaveShaper(),gain=ctx.createGain(),flutter=ctx.createOscillator(),flutterGain=ctx.createGain();
        voice.buffer=this.buffer;high.type='highpass';high.frequency.value=680;low.type='lowpass';low.frequency.value=1750;
        saturation.curve=Float32Array.from({length:512},(_,i)=>Math.tanh((i*2/511-1)*4.2)/Math.tanh(4.2));saturation.oversample='2x';
        crush.curve=Float32Array.from({length:512},(_,i)=>Math.round((i*2/511-1)*22)/22);
        gain.gain.setValueAtTime(.76,voiceStart);gain.gain.setValueAtTime(.36,voiceStart+.28);gain.gain.setValueAtTime(.74,voiceStart+.37);gain.gain.setValueAtTime(.42,voiceStart+.76);gain.gain.setValueAtTime(.74,voiceStart+.87);
        flutter.type='sine';flutter.frequency.value=8.5;flutterGain.gain.value=.085;flutter.connect(flutterGain).connect(gain.gain);
        voice.connect(high).connect(low).connect(saturation).connect(crush).connect(gain).connect(this.master);
        this.nodes.push(voice,high,low,saturation,crush,gain,flutter,flutterGain);
        this.noise(now+.22,.26,.075);
        this.noise(voiceStart,voiceEnd-voiceStart,.009);
        const tail=this.noise(voiceEnd+.02,.24,.07);
        tail.onended=()=>{if(this.active)onComplete();};
        flutter.start(voiceStart);flutter.stop(voiceEnd);voice.start(voiceStart,offset);
    }
    update(){if(this.master)this.master.gain.value=this.game.soundEnabled&&!document.hidden?1:0;}
    stop(){
        this.active=false;clearTimeout(this.timer);
        for(const timer of this.captionTimers)clearTimeout(timer);
        this.captionTimers=[];
        for(const node of this.nodes){try{node.stop?.();}catch{}node.disconnect();}
        this.nodes=[];this.master=null;
    }
}
