import { TestBed } from '@angular/core/testing';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { RoomService } from './room.service';

// Switching cameras closes the running producer before opening the new device.
// When the new device cannot be opened - common on phones - the user used to be
// left with no video at all until they left and rejoined the call.
describe('RoomService camera switch', () => {
  let service: RoomService;
  let originalGetUserMedia: any;
  let originalEnumerate: any;

  const canvasTrack = (): MediaStreamTrack => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    return (canvas as any).captureStream(5).getVideoTracks()[0];
  };

  const fakeProducer = (deviceId: string) => ({
    id: 'producer-' + deviceId,
    track: { getSettings: () => ({ deviceId }) },
    on: () => {},
    close: () => {},
    removeAllListeners: () => {},
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoggerModule.forRoot({ level: NgxLoggerLevel.OFF })],
    });
    service = TestBed.inject(RoomService);
    service.init({ peerId: 'test-peer' });

    (service as any)._mediasoupDevice = {
      canProduce: () => true,
      rtpCapabilities: { codecs: [{ kind: 'video', mimeType: 'video/VP8' }] },
    };
    (service as any)._sendTransport = {
      produce: async ({ track }) => ({
        id: 'producer-new',
        track,
        on: () => {},
        close: () => {},
        removeAllListeners: () => {},
      }),
    };
    spyOn((service as any).signalingService, 'sendRequest').and.returnValue(Promise.resolve({}));

    originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    originalEnumerate = navigator.mediaDevices.enumerateDevices;
    (navigator.mediaDevices as any).enumerateDevices = async () => [
      { kind: 'videoinput', deviceId: 'cam-back', label: 'back', groupId: '' },
      { kind: 'videoinput', deviceId: 'cam-front', label: 'front', groupId: '' },
    ];
  });

  afterEach(() => {
    (navigator.mediaDevices as any).getUserMedia = originalGetUserMedia;
    (navigator.mediaDevices as any).enumerateDevices = originalEnumerate;
  });

  it('restores the previous camera when the requested one cannot be opened', async () => {
    (service as any)._webcamProducer = fakeProducer('cam-back');

    const asked: string[] = [];
    (navigator.mediaDevices as any).getUserMedia = async (c: any) => {
      const id = c.video.deviceId.ideal;
      asked.push(id);
      if (id === 'cam-front') {
        throw new DOMException('Could not start video source', 'NotReadableError');
      }
      const stream = new MediaStream();
      stream.addTrack(canvasTrack());
      return stream;
    };

    const errors: any[] = [];
    service.onCamError.subscribe((e) => errors.push(e));

    await service.updateWebcam({ restart: true, newDeviceId: 'cam-front' });

    expect(asked).toEqual(['cam-front', 'cam-back']);
    expect((service as any)._webcamProducer).toBeTruthy();
    expect(errors.length).toBe(1);
  });

  it('switches cleanly and reports no error when the camera opens', async () => {
    (service as any)._webcamProducer = fakeProducer('cam-back');

    const asked: string[] = [];
    (navigator.mediaDevices as any).getUserMedia = async (c: any) => {
      asked.push(c.video.deviceId.ideal);
      const stream = new MediaStream();
      stream.addTrack(canvasTrack());
      return stream;
    };

    const errors: any[] = [];
    const produced: any[] = [];
    service.onCamError.subscribe((e) => errors.push(e));
    service.onCamProducing.subscribe((s) => produced.push(s));

    await service.updateWebcam({ restart: true, newDeviceId: 'cam-front' });

    expect(asked).toEqual(['cam-front']);
    expect(errors.length).toBe(0);
    expect(produced.length).toBe(1);
    expect((service as any)._webcamProducer).toBeTruthy();
  });

  it('does not blow up when the session was torn down by a reconnection', async () => {
    (service as any)._mediasoupDevice = null;
    (service as any)._sendTransport = null;

    const errors: any[] = [];
    service.onCamError.subscribe((e) => errors.push(e));

    await service.updateWebcam({ restart: true, newDeviceId: 'cam-front' });

    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('not connected to the room');
  });
});
