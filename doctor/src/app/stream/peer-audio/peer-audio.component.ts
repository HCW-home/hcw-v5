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
  }

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
