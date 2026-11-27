"""Render five original, sample-free AFTER HOURS loops with numpy and ffmpeg."""
from pathlib import Path
import subprocess

import numpy as np

RATE = 32000
OUTPUT = Path(__file__).resolve().parents[1] / "public/assets/office-score"
# Each chart is eight bars. A second chorus answers the first one.
# Root, four upper chord tones, and the lead phrase (beat, semitone above root, length).
CHARTS = {
    "corner-desk": (96, "swing", [
        (50, (4, 7, 11, 14)), (47, (3, 7, 10, 14)), (52, (3, 7, 10, 14)), (45, (4, 7, 10, 14)),
        (50, (4, 7, 9, 14)), (54, (3, 7, 10, 14)), (43, (4, 7, 11, 14)), (45, (4, 7, 10, 13))],
        [(0.67, 16, .7), (1.67, 14, .3), (2, 11, .85), (3.67, 7, .3)]),
    "red-pencil": (107, "syncopated", [
        (45, (3, 7, 10, 14)), (41, (4, 7, 11, 14)), (47, (3, 6, 10, 13)), (40, (4, 7, 10, 13)),
        (45, (3, 7, 10, 14)), (48, (4, 7, 11, 14)), (43, (5, 7, 10, 14)), (40, (4, 8, 10, 13))],
        [(0, 12, .36), (.75, 19, .2), (1.5, 15, .38), (3, 14, .64)]),
    "last-shuttle": (132, "clock", [
        (40, (3, 7, 10, 14)), (40, (3, 7, 9, 14)), (41, (4, 7, 11, 14)), (47, (4, 7, 10, 13)),
        (40, (3, 7, 10, 14)), (43, (4, 7, 11, 14)), (45, (3, 7, 10, 14)), (47, (4, 8, 10, 13))],
        [(0, 19, .5), (1.5, 15, .25), (2, 14, .5), (3.5, 12, .25)]),
    "green-light": (90, "waltz", [
        (48, (4, 7, 11, 14)), (52, (3, 7, 10, 14)), (53, (4, 7, 9, 14)), (43, (4, 7, 10, 14)),
        (45, (3, 7, 10, 14)), (50, (3, 7, 10, 14)), (43, (5, 7, 10, 14)), (48, (4, 7, 9, 14))],
        [(0, 16, .92), (1, 19, .46), (1.5, 21, .42), (2, 19, .92)]),
    "empty-platform": (76, "felt", [
        (50, (3, 7, 10, 14)), (46, (4, 7, 11, 14)), (53, (4, 7, 9, 14)), (48, (5, 7, 10, 14)),
        (43, (3, 7, 10, 14)), (46, (4, 7, 11, 14)), (45, (5, 7, 10, 14)), (50, (3, 7, 9, 14))],
        [(.5, 19, 1.3), (2, 15, .65), (3, 14, .8)]),
}


def render(name, bpm, feel, chart, phrase):
    rng = np.random.default_rng(78 + bpm)
    beat = 60 / bpm
    meter = 3 if feel == "waltz" else 4
    frames = round(16 * meter * beat * RATE)
    mix = np.zeros((frames, 2))

    def place(wave, when, pan):
        first = round(when * beat * RATE) % frames
        stereo = wave[:, None] * np.sqrt([(1-pan)/2, (1+pan)/2])
        count = min(len(wave), frames-first)
        mix[first:first+count] += stereo[:count]
        mix[:len(wave)-count] += stereo[count:]

    def note(when, pitch, length, sound, gain, pan=0):
        gate = length * beat
        tail = .65 if sound in ("keys", "felt") else .24
        t = np.arange(round((gate + tail)*RATE)) / RATE
        p = 2*np.pi*440*2**((pitch-69)/12)*t
        if sound == "bass":
            wave = np.sin(p) + .19*np.sin(2*p)*np.exp(-3*t)
        elif sound == "pluck":
            wave = np.sin(p) + .38*np.sin(2*p)*np.exp(-5*t) + .18*np.sin(3*p)*np.exp(-9*t)
        elif sound == "felt":
            wave = .84*np.sin(p) + .22*np.sin(2.002*p) + .16*np.sin(3.007*p)*np.exp(-3*t)
        else:
            wave = np.sin(p + 1.45*np.exp(-6*t)*np.sin(2*p))*(.95+.05*np.cos(23*t))
        env = (1-np.exp(-t/.008))*np.exp(-t*(2.8 if sound=="pluck" else 1.15))*np.exp(-np.maximum(0,t-gate)*8/tail)
        place(gain*wave*env, when, pan)

    def drum(when, sound, gain):
        t = np.arange(int(.23*RATE))/RATE
        if sound == "kick":
            wave = np.sin(2*np.pi*(47*t + 1.8*(1-np.exp(-t/.03))))*np.exp(-19*t)
        elif sound == "rim":
            wave = (np.sin(1180*t)+.5*np.sin(2970*t)+.4*rng.normal(size=len(t)))*np.exp(-72*t)
        else:
            noise = rng.normal(size=len(t))
            wave = np.diff(noise, prepend=noise[0])*np.exp(-95*t)*.26
        place(gain*wave*(1-np.exp(-t/.0015)),when,.22 if sound=="hat" else -.08)

    for bar in range(16):
        root, chord = chart[bar % 8]
        start = bar*meter
        quiet = feel in ("felt", "waltz")
        note(start,root-12,1.6 if quiet else .78,"bass",.28)
        if not quiet:
            note(start+2.5,root-5,.63,"bass",.21)
            drum(start,"kick",.29)
            drum(start+2,"kick",.18)
            for b in (1,3):
                drum(start+b,"rim",.13)
            for b in range(4):
                drum(start+b,"hat",.104)
                drum(start+b+(.67 if feel=="swing" else .5),"hat",.069)
        if feel in ("clock","felt","waltz"):
            for j in range(2*meter):
                note(start+j/2,root+chord[(j+bar//4)%4],.34 if feel=="clock" else .72,
                     "pluck" if feel=="clock" else "felt",.13,-.35+j%3*.24)
        else:
            for stab in ((.67,2.67) if feel=="swing" else (.75,2.5,3.5)):
                for j, extension in enumerate(chord):
                    note(start+stab+j*.013, root+extension,.52,"keys",.105,-.41+j*.19)
        for j,(at,interval,length) in enumerate(phrase):
            # Short answering phrases alternate with the head. Lead the last bar back to I.
            if bar%2 and j in (0,2):
                continue
            pitch = root + (12+chord[(j+1)%4] if bar%2 else interval)
            if bar >= 8 and j==2:
                pitch += 5
            note(start+at,pitch,length,"felt" if quiet else "pluck" if feel=="syncopated" else "keys",.245,.14)
    # Wrap the small room reflections around the loop boundary.
    dry = mix.copy()
    mix += .18*np.roll(dry[:,::-1],int(.093*RATE),axis=0) + .09*np.roll(dry,int(.167*RATE),axis=0)
    mix = np.tanh(mix*1.3)
    mix *= min(.83/np.max(np.abs(mix)), .135/np.sqrt(np.mean(mix**2)))
    dest = OUTPUT / (name+".ogg")
    subprocess.run(["ffmpeg","-loglevel","error","-y","-f","s16le","-ac","2","-ar",str(RATE),
                    "-i","pipe:0","-c:a","libvorbis","-q:a","5","-metadata","title="+name,
                    "-metadata","artist=AFTER HOURS",str(dest)],input=(mix*32767).astype("<i2").tobytes(),check=True)
    print(name, round(frames/RATE,1), "seconds")


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for title, settings in CHARTS.items():
        render(title, *settings)
