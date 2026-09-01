import { Subscription } from "rxjs";
import { Stream, LogService } from "hcw-stream-lib";
import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  OnChanges,
} from "@angular/core";

@Component({
  selector: "app-peer-video",
  templateUrl: "./peer-video.component.html",
  styleUrls: ["./peer-video.component.scss"],
})
export class PeerVideoComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild("videoElement") elementRef: ElementRef;

  @Input() stream: Stream;

  subscriptions: Subscription[] = [];
  private retryTimeout: any;
  constructor(private logger: LogService) {}

  ngAfterViewInit() {
    this.updateVideoSrc();
    // Mobile browsers pause media elements when the tab goes to the background
    // (app switch, screen lock) and do not resume them on return, which leaves a
    // frozen tile even though the track is still flowing.
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    const element = this.elementRef?.nativeElement;
    if (element && element.paused) {
      element.play().catch(() => {});
    }
  };

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    clearTimeout(this.retryTimeout);
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  ngOnChanges(changes) {
    if (changes.stream) {
      this.stream = changes.stream.currentValue;
      this.subscriptions.forEach((s) => s.unsubscribe());
      this.subscriptions = [];
      // The Stream object is reused when a peer republishes (camera toggle,
      // reconnection), so ngOnChanges will not fire again for it. Follow the
      // stream itself to re-attach the new MediaStream.
      if (this.stream) {
        this.subscriptions.push(
          this.stream.onLayerChange.subscribe(() => this.updateVideoSrc())
        );
      }
      this.updateVideoSrc();
    }
  }

  updateVideoSrc() {
    if (this.elementRef && this.stream) {
      this.elementRef.nativeElement.srcObject = this.stream.mediaStream;
    }
    clearTimeout(this.retryTimeout);
    this.retryTimeout = setTimeout(() => {
      if (this.elementRef && this.stream) {
        this.elementRef.nativeElement.srcObject = this.stream.mediaStream;
      }
    }, 500);
  }
}
