import { Stream } from "hcw-stream-lib";
import { Subscription } from "rxjs";
import {Component, Input, OnInit, OnDestroy, OnChanges, ViewChild, ElementRef, AfterViewInit} from "@angular/core";

@Component({
  selector: "app-peer-audio",
  templateUrl: "./peer-audio.component.html",
  styleUrls: ["./peer-audio.component.scss"]
})
export class PeerAudioComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {

  @ViewChild("audioElement") elementRef: ElementRef;

  @Input() stream: Stream
  subscriptions: Subscription[] = [];
  constructor() { }

  ngAfterViewInit() {
    this.updateAudioSrc();
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

  ngOnChanges(changes) {
    if (changes.stream) {
      this.stream = changes.stream.currentValue;
      this.subscriptions.forEach((s) => s.unsubscribe());
      this.subscriptions = [];
      // Same Stream object across a republish or a reconnection: without this the
      // audio element would keep the old, ended track.
      if (this.stream) {
        this.subscriptions.push(
          this.stream.onLayerChange.subscribe(() => this.updateAudioSrc())
        );
      }
      this.updateAudioSrc();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  updateAudioSrc() {
    if (this.elementRef && this.stream) {
      this.elementRef.nativeElement.srcObject = this.stream.mediaStream;
    }
  }

  ngOnInit(): void {
  }

}
