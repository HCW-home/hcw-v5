import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { RoomService } from './room.service';

// Regression cover for the local volume meter: it used to be an uncancellable
// requestAnimationFrame loop that emitted on every frame and stacked a new loop
// on every mic (re)start.
describe('RoomService volume meter', () => {
  let service: RoomService;
  let contexts: AudioContext[] = [];

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  function makeAudioStream(): MediaStream {
    const ctx = new AudioContext();
    contexts.push(ctx);
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    osc.connect(dest);
    osc.start();
    return dest.stream;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoggerModule.forRoot({ level: NgxLoggerLevel.OFF })],
    });
    service = TestBed.inject(RoomService);
    service.init({ peerId: 'test-peer' });
  });

  afterEach(() => {
    service.disconnectVolumeMeter();
    contexts.forEach((c) => c.close().catch(() => {}));
    contexts = [];
  });

  it('stops scheduling frames once disconnected', async () => {
    const raf = spyOn(window, 'requestAnimationFrame').and.callThrough();

    service.connectVolumeMeter(makeAudioStream());
    await wait(250);
    expect(raf.calls.count()).toBeGreaterThan(1);

    service.disconnectVolumeMeter();
    const atStop = raf.calls.count();
    await wait(250);

    expect(raf.calls.count()).toBe(atStop);
  });

  it('keeps a single loop when the mic is restarted', async () => {
    const raf = spyOn(window, 'requestAnimationFrame').and.callThrough();

    service.connectVolumeMeter(makeAudioStream());
    await wait(300);
    const oneLoop = raf.calls.count();

    raf.calls.reset();
    service.connectVolumeMeter(makeAudioStream());
    await wait(300);
    const afterRestart = raf.calls.count();

    // A leaked loop would roughly double the frame rate.
    expect(afterRestart).toBeLessThan(oneLoop * 1.6);
  });

  it('emits nothing while nobody is subscribed', async () => {
    const emitted: any[] = [];
    service.connectVolumeMeter(makeAudioStream());
    await wait(300);

    service.onVolumeChange.subscribe((v) => emitted.push(v));
    expect(emitted.length).toBe(0);
  });

  it('never schedules its frames inside the Angular zone', async () => {
    // This is the whole point of the fix: a zone-patched frame callback drags a
    // full change detection pass along at display refresh rate.
    const original = window.requestAnimationFrame.bind(window);
    const inZone: boolean[] = [];

    spyOn(window, 'requestAnimationFrame').and.callFake(((cb: FrameRequestCallback) => {
      inZone.push(NgZone.isInAngularZone());
      return original(cb);
    }) as any);

    service.connectVolumeMeter(makeAudioStream());
    await wait(250);

    expect(inZone.length).toBeGreaterThan(1);
    expect(inZone.some((v) => v)).toBe(false);
  });

  it('throttles emissions well below the frame rate when subscribed', async () => {
    const emitted: any[] = [];
    service.onVolumeChange.subscribe((v) => emitted.push(v));

    const raf = spyOn(window, 'requestAnimationFrame').and.callThrough();
    service.connectVolumeMeter(makeAudioStream());
    await wait(500);

    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.length).toBeLessThan(10);
    expect(emitted.length).toBeLessThan(raf.calls.count());
  });
});
