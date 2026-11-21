"""AFTER HOURS v2 original score. No samples, network, or model calls.

Requires Python 3.10+, numpy, scipy, and ffmpeg with libvorbis.
Run from any directory: python compose.py
The eight scores below were composed specifically for this game's dramatic roles.
"""
from __future__ import annotations
import hashlib, json, math, pathlib, shutil, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent
SR = 44100
MASTER = ROOT / 'masters'
MASTER.mkdir(exist_ok=True)
RNG = np.random.default_rng(20261121)

def hz(note): return 440 * 2 ** ((note - 69) / 12)
def filtered(x, cutoff, kind='lowpass', order=2):
    return sosfilt(butter(order, cutoff, btype=kind, fs=SR, output='sos'), x)

def voice(kind, note, duration, velocity=.6):
    """Band-limited acoustic-inspired additive/FM instruments, not sampled audio."""
    tail = {'piano':1.4,'felt':1.8,'epiano':1.5,'pluck':.65,'bass':.35,
            'strings':1.1,'pad':1.8,'bell':2.2,'marimba':.45}.get(kind,.2)
    total=duration+tail
    t=np.arange(int(total*SR),dtype=np.float64)/SR
    f=hz(note)
    attack={'strings':.18,'pad':.45,'felt':.012,'bell':.006}.get(kind,.004)
    gate=(1-np.exp(-t/attack))
    release=np.where(t<duration,1,np.exp(-(t-duration)/max(.04,tail/5)))
    phase=RNG.uniform(-.01,.01)
    if kind in ('piano','felt'):
        x=np.zeros_like(t)
        soft=kind=='felt'
        for k in range(1,13):
            if f*k>SR*.43: break
            amp=(1/k**(1.75 if soft else 1.5))*np.exp(-t*(.55+.23*k+f/2500))
            # Slight string inharmonicity; quiet detuned upper partials give body.
            freq=f*k*math.sqrt(1+.000035*k*k)
            x += amp*np.sin(2*np.pi*freq*t+phase)
            if k<=3: x += .07*amp*np.sin(2*np.pi*freq*1.0013*t+.13)
        hammer=filtered(RNG.normal(0,1,len(t)),3000 if soft else 6500)
        x+=hammer*np.exp(-t/0.009)*(.025 if soft else .05)
        x*=gate*release
    elif kind=='epiano':
        mod=(1.4+.8*velocity)*np.exp(-t/0.3)
        x=np.sin(2*np.pi*f*t+mod*np.sin(2*np.pi*f*2*t))*.72
        x+=.15*np.sin(2*np.pi*f*3*t)*np.exp(-t/.18)
        x*=np.exp(-t/.95)*gate*release*(.94+.06*np.sin(2*np.pi*4.3*t))
    elif kind=='pluck':
        x=np.zeros_like(t)
        for k in range(1,17):
            if f*k>SR*.43: break
            # Pluck position excludes selected partials; higher strings decay faster.
            amp=math.sin(k*.22*math.pi)/(k**1.25)
            x+=amp*np.sin(2*np.pi*f*k*t+phase)*np.exp(-t*(1.2+k*.29))
        pick=filtered(RNG.normal(0,1,len(t)),4200)
        x=(x+.025*pick*np.exp(-t/.012))*gate*release
    elif kind=='bass':
        x=(np.sin(2*np.pi*f*t)+.2*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t))
        x*=np.exp(-t/1.05)*gate*release
    elif kind in ('strings','pad'):
        x=np.zeros_like(t)
        for detune in (-.0018,.0015):
            vib=.0011*np.sin(2*np.pi*4.6*t+phase)
            p=2*np.pi*f*(1+detune)*t+.025*np.sin(2*np.pi*4.6*t)
            for k in range(1,9 if kind=='strings' else 6):
                if f*k>SR*.4: break
                x+=np.sin(k*p+phase)/(k**(1.7 if kind=='strings' else 2.1))
        x*=gate*release*.36
        x=filtered(x,3200 if kind=='strings' else 1700)
    elif kind=='bell':
        x=(np.sin(2*np.pi*f*t)*np.exp(-t/1.8)
            +.24*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.5)
            +.08*np.sin(2*np.pi*f*5.4*t)*np.exp(-t/.2))
        x*=gate*release
    elif kind=='marimba':
        x=(np.sin(2*np.pi*f*t)*np.exp(-t/.38)
            +.28*np.sin(2*np.pi*f*4*t)*np.exp(-t/.065)
            +.06*np.sin(2*np.pi*f*9.2*t)*np.exp(-t/.02))*gate*release
    else: raise ValueError(kind)
    return (x*velocity).astype(np.float32)

def percussion(kind, vel):
    d={'kick':.24,'brush':.24,'hat':.10,'tap':.09,'tick':.12,'shaker':.12}[kind]
    t=np.arange(int(d*SR))/SR
    noise=RNG.normal(0,1,len(t))
    if kind=='kick':
        phase=2*np.pi*(45*t+55*.022*(1-np.exp(-t/.022)))
        x=np.sin(phase)*np.exp(-t/.067)+.035*noise*np.exp(-t/.006)
    elif kind=='brush':
        x=filtered(filtered(noise,950,'highpass'),6500)*np.exp(-t/.055)*.25
        x+=.035*np.sin(2*np.pi*185*t)*np.exp(-t/.035)
    elif kind in ('hat','shaker'):
        x=filtered(noise,6500,'highpass')*np.exp(-t/(.016 if kind=='hat' else .034))*.16
    elif kind=='tap':
        x=(np.sin(2*np.pi*620*t)+.22*np.sin(2*np.pi*1190*t))*np.exp(-t/.015)*.18
    else:
        x=(np.sin(2*np.pi*1700*t)+.3*np.sin(2*np.pi*2730*t))*np.exp(-t/.023)*.11
    x*=np.minimum(t/.0015,1)
    return (x*vel).astype(np.float32)

class Score:
    def __init__(self, slug, bpm, meter, bars, key, description, sections):
        self.slug,self.bpm,self.meter,self.bars,self.key=slug,bpm,meter,bars,key
        self.beat=60/bpm
        self.n=round(bars*meter*self.beat*SR)
        self.audio=np.zeros((self.n,2),dtype=np.float32)
        self.events=[]
        self.description,self.sections=description,sections
    def add(self, kind, note, bar, beat, length, vel=.4, pan=0):
        start=round((bar*self.meter+beat)*self.beat*SR)
        sound=voice(kind,note,length*self.beat,vel)
        self.mix(sound,start,pan)
        self.events.append({'instrument':kind,'note':note,'bar':bar+1,'beat':beat,'beats':length,'velocity':vel,'pan':pan})
    def drum(self,kind,bar,beat,vel=.3,pan=0):
        self.mix(percussion(kind,vel),round((bar*self.meter+beat)*self.beat*SR),pan)
        self.events.append({'instrument':kind,'bar':bar+1,'beat':beat,'velocity':vel,'pan':pan})
    def mix(self,sound,start,pan):
        # Circular placement carries tails across the repeat boundary without cutting them.
        left=math.sqrt((1-pan)/2);right=math.sqrt((1+pan)/2)
        off=start%self.n;remain=len(sound);src=0
        while remain:
            count=min(remain,self.n-off)
            self.audio[off:off+count,0]+=sound[src:src+count]*left
            self.audio[off:off+count,1]+=sound[src:src+count]*right
            src+=count;remain-=count;off=0
    def chord(self, notes,bar,beat,length,kind='piano',vel=.18,spread=.017):
        for j,note in enumerate(notes):
            self.add(kind,note,bar,beat+j*spread,length,vel*(1-.04*j),-.24+.12*j)
    def melody(self,bar,notes,kind='piano',vel=.28,transpose=0):
        for beat,note,duration in notes:
            self.add(kind,note+transpose,bar,beat,duration,vel*(1+RNG.uniform(-.08,.08)),.08)

def office_groove():
    s=Score('office-groove',94,4,24,'D major','Dry, lightly swung electric keys, acoustic-style walking bass and brushes. A playful rising question answered by a clipped descent; B moves through G–F#–Bm.','A 1–8 / B 9–16 / A varied 17–24')
    A=[[50,54,57,61,64],[54,57,61,64],[47,50,54,57],[52,56,59,62],[52,55,59,62,66],[45,49,55,59],[50,54,57,59],[45,49,55,61]]
    B=[[43,47,50,54],[49,52,55,59],[42,46,49,52],[47,50,54,61],[52,55,59,66],[45,49,55,59],[50,54,57,59],[45,49,55,61]]
    motifs=[[(.6,74,.35),(1.6,78,.6),(2.6,76,.35),(3.3,73,.4)],[(.6,73,.5),(2.1,71,.5),(3.1,69,.6)],[(0,71,.7),(1.6,74,.4),(2.6,78,.4),(3.3,76,.4)],[(1.1,76,.6),(2.6,74,.35),(3.3,73,.4)],[(.6,76,.6),(1.6,79,.4),(3.1,78,.5)],[(0,76,.6),(1.6,73,.6),(3.1,71,.5)],[(.6,74,1.1),(2.6,78,.5)],[(.6,76,.4),(1.3,73,.4),(2.1,69,.5),(3.1,73,.5)]]
    for b in range(24):
        chord=(B if 8<=b<16 else A)[b%8];root=chord[0]-12
        s.chord([n+12 for n in chord[1:]],b,.6,.8,'epiano',.15)
        s.chord([n+12 for n in chord[1:]],b,2.6,.8,'epiano',.13)
        for beat,n in [(0,root),(1.1,root+7),(2,root+12),(3.1,root+7)]:s.add('bass',n,b,beat,.72,.28,-.14)
        s.melody(b,motifs[b%8],kind='epiano',vel=.23 if b<16 else .20,transpose=0)
        if 8<=b<16 and b%2==0:s.add('marimba',chord[-1]+12,b,3.3,.25,.12,.48)
        for beat in (0,2):s.drum('kick',b,beat,.2)
        for beat in (1,3):s.drum('brush',b,beat,.48,.18)
        for beat in (0,.6,1,1.6,2,2.6,3,3.6):s.drum('shaker',b,beat,.27,-.35)
    return s

def office_pressure():
    s=Score('office-pressure',110,4,24,'E minor','Muted piano/marimba ostinato over low strings; measured ticks and restrained kick. B changes the bass progression and introduces a held upper counterline.','A 1–8 / B 9–16 / A intensified 17–24')
    A=[[52,55,59,66],[48,52,55,59],[45,48,52,59],[47,51,54,57]]
    B=[[48,52,55,62],[45,48,52,59],[52,55,59,66],[47,51,54,57]]
    for b in range(24):
        c=(B if 8<=b<16 else A)[b%4]
        for k,i in enumerate([0,2,1,2,0,3,2,1]):s.add('marimba',c[i]+12,b,k*.5,.29,.22 if k%2==0 else .15,.15)
        s.add('bass',c[0]-12,b,0,3.6,.3,-.1)
        s.chord(c,b,0,3.4,'strings',.08,0)
        if b%2==0:s.melody(b,[(.5,c[2]+12,1),(2.5,c[3]+12,1.1)],'felt',.23)
        if 8<=b<16:s.add('strings',c[1]+24,b,.1,3.2,.07,.4)
        for beat in (0,2):s.drum('kick',b,beat,.29)
        for beat in (1,3):s.drum('tap',b,beat,.38,-.3)
        for beat in (.5,1.5,2.5,3.5):s.drum('hat',b,beat,.22,.4)
    return s

def cafe_warmth():
    s=Score('cafe-warmth',80,4,24,'G major','Fingerpicked acoustic-style plucks, a gentle piano melody and soft shaker. A lilting two-bar question; B opens to C and A minor with bell answers.','A 1–8 / B 9–16 / A varied 17–24')
    A=[[43,50,55,59,62],[40,47,52,55,59],[48,55,60,62,67],[50,57,62,66,69]]
    B=[[48,55,60,64,67],[45,52,57,60,64],[43,50,55,59,62],[50,57,62,64,69]]
    motifs=[[(0,71,.8),(1,74,.65),(2.5,76,.5),(3.25,74,.5)],[(.5,71,1.1),(2,67,1.4)],[(0,72,.7),(1.5,76,.5),(2.5,74,.8)],[(.5,69,.6),(1.5,66,.6),(2.5,69,1)],[(0,76,.7),(1,79,.8),(2.5,76,1)],[(.5,72,1),(2,71,1.4)],[(0,71,.8),(1.5,74,.6),(2.5,71,.7)],[(0,69,1),(2,66,1.5)]]
    for b in range(24):
        c=(B if 8<=b<16 else A)[b%4]
        for k,i in enumerate([0,2,3,4,1,2,4,3]):s.add('pluck',c[i],b,k*.5,.7,.18 if i else .26,-.3+(.1*i))
        s.melody(b,motifs[b%8],'piano',.21)
        if 8<=b<16 and b%2:s.add('bell',c[3]+12,b,3.25,.4,.065,.5)
        for beat in (.5,1.5,2.5,3.5):s.drum('shaker',b,beat,.18,-.4)
        if b>=8:s.drum('tap',b,2,.16,.3)
    return s

def rooftop_heart():
    s=Score('rooftop-heart',72,3,24,'B-flat major','Slow three-beat piano waltz with a soft string response. The B section climbs and then leaves space for a confession; no drum kit.','A 1–8 / B 9–16 / A with answering strings 17–24')
    A=[[46,53,58,62,65],[43,50,55,58,62],[39,46,51,55,58],[41,48,53,57,60]]
    B=[[48,55,60,63,67],[41,48,53,57,60],[50,57,62,65,69],[43,50,55,58,62],[39,46,51,55,58],[41,48,53,57,60],[46,53,58,62,65],[41,48,53,57,60]]
    motifs=[[(0,74,.8),(1,77,.6),(2,79,.7)],[(0,77,1.6),(2,74,.6)],[(.5,75,1),(2,74,.7)],[(0,72,1.4),(2,69,.6)],[(0,72,.8),(1,75,.8),(2,79,.7)],[(0,77,1.5),(2,72,.7)],[(0,74,2.4)],[(.5,72,.8),(2,69,.7)]]
    for b in range(24):
        c=B[b%8] if 8<=b<16 else A[b%4]
        s.add('piano',c[0],b,0,1.9,.23,-.25)
        s.chord(c[1:4],b,1,.9,'piano',.13)
        s.chord(c[1:4],b,2,.7,'piano',.11)
        s.chord([n+12 for n in c[1:4]],b,0,2.7,'strings',.075,0)
        s.melody(b,motifs[b%8],'piano',.24 if b<16 else .21)
        if b>=16 and b%2==1:s.add('strings',c[-1]+12,b,.6,2.1,.075,.45)
    return s

def rainy_memory():
    s=Score('rainy-memory',78,4,24,'F-sharp minor','Wistful tremolo electric piano, widely spaced upper notes and a quiet filtered synthetic rain bed. Syncopated chord answers contrast a more continuous B melody.','A 1–8 / B 9–16 / A sparse 17–24')
    A=[[42,49,54,57,61],[38,45,50,54,57],[45,52,57,61,64],[40,47,52,56,59]]
    B=[[47,54,59,62,66],[42,49,54,57,61],[38,45,50,54,57],[37,44,49,53,56]]
    motifs=[[(.5,73,1.2),(2,76,.8),(3.25,73,.5)],[(0,74,1.4),(2.5,69,1)],[(.5,73,.8),(1.5,76,1),(3,73,.7)],[(0,71,2.2)],[(0,74,.8),(1,78,.8),(2.5,76,.8)],[(.5,73,1.1),(2.5,69,1)],[(0,74,1),(1.5,73,.7),(2.5,69,.8)],[(.5,68,1.1),(2.5,73,.8)]]
    for b in range(24):
        c=(B if 8<=b<16 else A)[b%4]
        s.add('bass',c[0],b,0,2.8,.18,-.2)
        s.chord(c[1:],b,.5,1.1,'epiano',.16)
        s.chord(c[1:],b,2.5,1.2,'epiano',.13)
        s.melody(b,motifs[b%8],'epiano',.24)
        if 8<=b<16:s.chord(c[2:],b,0,3.5,'pad',.065,0)
        if b%4==3:s.add('bell',c[-1]+12,b,3,.4,.06,.55)
        if b>=8 and b<16:
            for beat in (1.5,3.5):s.drum('shaker',b,beat,.17,-.4)
    return s

def archive_unease():
    s=Score('archive-unease',60,4,16,'D minor with suspended ninths','Sparse felt piano, distant glass over slow minor pads and synthetic tape flutter. The B section introduces a quiet heartbeat and descending unanswered notes.','A 1–8 / B 9–16')
    A=[[38,45,50,53,64],[34,41,46,50,57],[43,50,55,58,69],[45,52,55,61,64]]
    motifs=[[(.75,74,1.2),(2.75,76,.7)],[(1.5,77,1.6)],[(.25,74,.9),(2.5,70,.9)],[(1.25,73,1.8)]]
    for b in range(16):
        c=A[b%4]
        s.chord(c[1:4],b,0,3.8,'pad',.12,0)
        if b%2==0:s.add('felt',c[0],b,0,3.1,.24,-.2)
        if b%2==0:s.melody(b,motifs[(b//2)%4],'felt',.22)
        if b%4==3:s.add('bell',c[-1]+12,b,2.5,.7,.065,.6)
        if b>=8:
            s.drum('kick',b,.1,.12)
            s.drum('kick',b,.7,.08)
            if b%2:s.melody(b,[(1.2,c[3]+12,.7),(2.7,c[2]+12,.8)],'felt',.17)
    return s

def archive_pursuit():
    s=Score('archive-pursuit',104,5,24,'C minor','Restrained five-beat thriller pulse grouped 3+2: low piano/bass and short string swells, with a higher marimba reply in B. No loud stingers.','A 1–8 / B 9–16 / A with counterline 17–24')
    A=[[36,43,48,51,55],[32,39,44,48,51],[41,48,53,56,60],[43,50,53,59,62]]
    B=[[39,46,51,55,58],[34,41,46,50,53],[36,43,48,51,55],[43,50,53,59,62]]
    for b in range(24):
        c=(B if 8<=b<16 else A)[b%4]
        for beat,i in [(0,0),(.75,2),(1.5,1),(2.25,2),(3,0),(3.75,3),(4.5,2)]:
            s.add('piano',c[i],b,beat,.37,.23 if i==0 else .16,-.16)
        s.add('bass',c[0]-12 if c[0]>=40 else c[0],b,0,2.6,.18)
        s.add('bass',c[0],b,3,1.7,.18)
        s.chord(c[2:],b,.25,1.8,'strings',.105,0)
        s.chord(c[2:],b,3.25,1.4,'strings',.105,0)
        if b%2==0:s.melody(b,[(.5,c[2]+12,.5),(2,c[3]+12,.8),(4,c[1]+12,.7)],'marimba',.20)
        if 8<=b<16:s.add('strings',c[-1]+12,b,1,3.5,.065,.4)
        for beat in (0,3):s.drum('kick',b,beat,.27)
        for beat in (1.5,4):s.drum('tap',b,beat,.30,-.35)
        for beat in (.5,1,2,2.5,3.5,4.5):s.drum('hat',b,beat,.15,.35)
    return s

def resolution_dawn():
    s=Score('resolution-dawn',72,4,20,'E major','Warm resolved piano theme with a slow string halo; an eight-bar melody opens into a brighter B section and a four-bar cadence. Spacious, no drums.','A 1–8 / B 9–16 / cadence and loop turnaround 17–20')
    A=[[40,47,52,56,59],[37,44,49,52,56],[45,52,57,61,64],[47,54,59,63,66]]
    B=[[45,52,57,61,64],[47,54,59,63,66],[44,51,56,59,63],[37,44,49,52,56]]
    motifs=[[(0,76,1),(1.5,80,.7),(2.5,78,.8)],[(.5,76,1),(2,73,1.5)],[(0,76,.8),(1,81,1.4),(3,80,.7)],[(.5,78,1),(2,75,1.4)],[(0,81,.8),(1.25,83,.8),(2.5,80,1)],[(0,78,1.4),(2,75,1.4)],[(.5,76,2.5)],[(0,75,1),(2,71,1.2)]]
    for b in range(20):
        c=(B if 8<=b<16 else A)[b%4]
        for beat,i in [(0,0),(.75,1),(1.5,2),(2,3),(2.75,2),(3.5,4)]:s.add('piano',c[i],b,beat,.9,.16,-.3+.1*i)
        s.chord(c[1:4],b,0,3.6,'strings',.07,0)
        s.melody(b,motifs[b%8],'piano',.24)
        if 8<=b<16 and b%2==0:s.add('bell',c[-1]+12,b,3.25,.4,.05,.5)
    return s

def ambience(s):
    if s.slug not in ('rainy-memory','archive-unease'):return
    # Circular spectral noise gives a seamless quiet original texture, not a field recording.
    rng=np.random.default_rng(100 if s.slug=='rainy-memory' else 101)
    frequencies=np.fft.rfftfreq(s.n,1/SR)
    phases=rng.uniform(0,2*np.pi,len(frequencies))
    spectral=(1/(1+(frequencies/1700)**2))*(frequencies/(frequencies+450))
    bed=np.fft.irfft(spectral*np.exp(1j*phases),n=s.n)
    bed/=np.std(bed)
    t=np.arange(s.n)/SR
    fluct=.82+.18*np.sin(2*np.pi*3*t/(s.n/SR))
    for ch in range(2):s.audio[:,ch]+=(np.roll(bed,ch*173)*fluct*(.0017 if s.slug=='rainy-memory' else .0012)).astype(np.float32)

def finalize(s):
    ambience(s)
    dry=s.audio.copy()
    # Quiet stereo room reflections with circular delays preserve loop continuity.
    wet=np.zeros_like(dry)
    room=.15 if s.slug.startswith('office') else .24
    for delay,gain in [(.071,.38),(.113,.30),(.173,.23),(.239,.17),(.337,.11),(.451,.075),(.617,.045)]:
        for ch in range(2):
            reflected=np.roll(dry[:,1-ch],round((delay+ch*.007)*SR))
            warm=2048
            wet[:,ch]+=filtered(np.concatenate((reflected[-warm:],reflected)),4200)[warm:]*gain*room
    audio=(dry+wet).astype(np.float64)
    audio-=audio.mean(axis=0)
    # Fifteen-millisecond cosine edge ramps prevent codec padding/rounding clicks.
    # This is below a rhythmic subdivision and adds no separate silent gap.
    edge=round(.015*SR)
    ramp=np.sin(np.linspace(0,math.pi/2,edge))**2
    audio[:edge]*=ramp[:,None]
    audio[-edge:]*=ramp[::-1,None]
    peak=float(np.max(np.abs(audio)))
    rms=float(np.sqrt(np.mean(audio**2)))
    target_rms=-23 if s.slug=='archive-unease' else -20
    audio*=min(10**(-3.0/20)/peak,10**(target_rms/20)/rms)
    # Dynamic mix retained; final gain only. No compressor or clipping distortion.
    pcm=np.round(np.clip(audio,-.9999,.9999)*32767).astype('<i2')
    wav=MASTER/(s.slug+'.wav')
    with wave.open(str(wav),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    ogg=ROOT/(s.slug+'.ogg')
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','5',str(ogg)],check=True)
    # Decode exported artifact so the delivery (not only the synth buffer) is inspected.
    decoded=subprocess.run(['ffmpeg','-v','error','-i',str(ogg),'-f','f32le','-acodec','pcm_f32le','-'],check=True,stdout=subprocess.PIPE).stdout
    dec=np.frombuffer(decoded,dtype='<f4').reshape(-1,2)
    pcm_rms=float(np.sqrt(np.mean(audio**2)))
    d=np.abs(np.diff(audio,axis=0))
    seam=np.abs(audio[0]-audio[-1])
    section_rms=[]
    for start in range(0,s.bars,4):
        a=round(start*s.meter*s.beat*SR);b=round(min(start+4,s.bars)*s.meter*s.beat*SR)
        section_rms.append(round(20*np.log10(max(1e-12,float(np.sqrt(np.mean(audio[a:b]**2))))),2))
    root_events=ROOT/(s.slug+'.score.json')
    root_events.write_text(json.dumps(s.events,indent=2),encoding='utf-8')
    result={
      'id':s.slug,'file':ogg.name,'master':'masters/'+wav.name,'score':root_events.name,
      'bpm':s.bpm,'meter':str(s.meter)+'/4','key':s.key,'bars':s.bars,
      'durationSeconds':round(s.n/SR,6),'sampleRate':SR,'channels':2,
      'sections':s.sections,'composition':s.description,'eventCount':len(s.events),
      'instruments':sorted(set(e['instrument'] for e in s.events)),
      'sha256':hashlib.sha256(ogg.read_bytes()).hexdigest(),'bytes':ogg.stat().st_size,
      'masterPeakDbFS':round(20*np.log10(float(np.max(np.abs(audio)))),3),
      'masterRmsDbFS':round(20*np.log10(pcm_rms),3),
      'masterDC':audio.mean(axis=0).tolist(),'masterClippedSamples':int(np.sum(np.abs(pcm)>=32767)),
      'masterLoopSeamAbsolute':seam.tolist(),'masterAdjacentDifferenceP99':np.quantile(d,.99,axis=0).tolist(),
      'fourBarRmsDbFS':section_rms,'decodedDurationSeconds':round(len(dec)/SR,6),
      'decodedPeakDbFS':round(20*np.log10(float(np.max(np.abs(dec)))),3),
      'decodedRmsDbFS':round(20*np.log10(float(np.sqrt(np.mean(dec**2)))),3),
      'decodedLoopSeamAbsolute':np.abs(dec[0]-dec[-1]).tolist(),
      'passedChecks':{'duration48to90':48<=s.n/SR<=90,'noMasterClipping':not np.any(np.abs(pcm)>=32767),'masterSeamBelowPoint01':bool(np.max(seam)<.01),'exportDecodes':len(dec)>0,'exportSeamBelowPoint01':bool(np.max(np.abs(dec[0]-dec[-1]))<.01),'exportPeakBelowMinus1dB':bool(np.max(np.abs(dec))<10**(-1/20))}
    }
    assert all(result['passedChecks'].values()),result
    print(s.slug,round(s.n/SR,2),'seconds',result['decodedRmsDbFS'],'dB RMS',flush=True)
    return result

if __name__=='__main__':
    if not shutil.which('ffmpeg'):raise SystemExit('ffmpeg is required')
    tracks=[]
    for factory in [office_groove,office_pressure,cafe_warmth,rooftop_heart,rainy_memory,archive_unease,archive_pursuit,resolution_dawn]:
        tracks.append(finalize(factory()))
    assert len({x['sha256'] for x in tracks})==8
    manifest={
      'project':'AFTER HOURS v2','created':'2026-11-21','provenance':'Original melodies, chord arrangements, rhythms, and synthesis authored for this project. No samples, existing melodies, external recordings, downloaded audio, Fal or OpenAI calls.',
      'method':'Deterministic NumPy/SciPy additive and FM instrument synthesis; score-specific note/rhythm/harmony arrangements; circular tail placement and room reflections; Vorbis quality 5 encoding.',
      'generator':'compose.py','generatorSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
      'reproducibleCommand':'python compose.py','requirements':['Python 3.10+','numpy','scipy','ffmpeg with libvorbis'],
      'looping':'OGG files are intended for whole-file looping. Exact musical lengths are derived from the documented bars/meter/tempo. Tails and reverberation wrap across the boundary. Fifteen-millisecond cosine ramps prevent codec-boundary clicks; no separate silent gap is inserted.',
      'mix':'Stereo, 44100 Hz. Gain-only normalization limits RMS to -20 dBFS (-23 for archive-unease) and peak to -3 dBFS, whichever is quieter. No clipped samples. Suggested game playback volume 30–50%, crossfade 1.5–2.5 sec, mood dwell time >= 8 sec.',
      'listeningStatus':'Objective waveform/export/structure checks only. No claim of human listening approval, live acoustic performance, or commercial mastering.',
      'tracks':tracks
    }
    (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Wrote 8 tracks and manifest.json',flush=True)
