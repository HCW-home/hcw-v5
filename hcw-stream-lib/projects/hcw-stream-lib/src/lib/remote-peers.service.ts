import { Stream } from './stream';
import { LogService } from './log.service';
import { Peer } from './peer';
import { Observable } from 'rxjs/internal/Observable';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as mediasoup from 'mediasoup-client';

@Injectable({
  providedIn: 'root'
})
export class RemotePeersService {

	public remotePeers: Observable<Peer[]>;
	private _remotePeers: BehaviorSubject<Peer[]> = new BehaviorSubject([]);

  private peers: Peer[] = []
  constructor(private logger: LogService) {
    this.remotePeers = this._remotePeers.asObservable()
   }


  updatePeers() {
    // Emit a new array reference so change detection sees the mutation.
    setTimeout(() => 	this._remotePeers.next([...this.peers])    ,0)
  }

  clearPeers(){
    // Never swap the subject: subscribers took their reference once and would
    // silently stop receiving updates for the rest of the call.
    this.peers = []
    this.updatePeers()
  }
  newPeer(id): Peer {
    const peer = new Peer()
    peer.id = id;
    peer.streams = []
    this.addPeer(peer)
    this.updatePeers()
    return peer
  }
  closePeer(id){
    this.peers = this.peers.filter((peer) => peer.id !== id);
    this.updatePeers()
  }


  addPeer(peer: Peer) {
    this.peers.push(peer)
  }

  addPeers(peers){
		// Reconcile against the authoritative list returned by the server: peers that
		// left while we were disconnected must disappear, not linger forever.
		const ids = new Set((peers || []).map(peer => peer.id));

		this.peers = this.peers.filter(p => ids.has(p.id));

		for (const peer of peers || [])
		{
			if (!this.peers.find(p=>peer.id === p.id))
			{
        this.peers.push({ id: peer.id, streams:[] });
			}
		}
		this.updatePeers();
  }

  closeStream(consumerId: string) {
    for (const peer of this.peers) {
      const index = peer.streams.findIndex(s => s.consumer?.id === consumerId)

      if (index !== -1) {
        peer.streams.splice(index, 1)
        this.updatePeers()
        return
      }
    }
  }

  newConsumer(consumer: mediasoup.types.Consumer, peerId: string, type, producerPaused) {

    let peer = this.peers.find(peer => peer.id === peerId)

    if (!peer) {
      this.logger.warn('Couldn\'t find peer', peerId, this.peers)
      peer = this.newPeer(peerId)
    }
    const existingStream = peer.streams.find(stream => stream.consumer?.appData.source === consumer.appData.source)

    if (existingStream) {
      existingStream.setConsumer(consumer)
    } else {
      const stream = new Stream()
      stream.peer = peer
      stream.type = type;
      stream.producerPaused = producerPaused;
      stream.setConsumer(consumer)
      peer.streams.push(stream)
    }

    this.updatePeers()

  }

  onConsumerLayerChanged(consumerId) {



      const stream = this.getStreamByConsumerId( consumerId)
      if (stream) {

        stream.consumerLayerChanged()
      }

  }


  getStreamByConsumerId(consumerId: string): Stream {
    for (const peer of this.peers) {
      const stream = peer.streams.find(s => s.consumer?.id === consumerId)
      if (stream) {
        return stream
      }
    }
    return null
  }
}
