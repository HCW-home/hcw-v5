import { LogService } from './log.service';
import { Injectable } from '@angular/core';


import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';


const requestTimeout = 20000

/**
 * Error produced when a socket request has a timeout.
 */
export class SocketTimeoutError extends Error
{
	constructor(message)
	{
		super(message);

		this.name = 'SocketTimeoutError';

    if (Error.hasOwnProperty('captureStackTrace')) // Just in V8.
      // @ts-ignore
			Error.captureStackTrace(this, SocketTimeoutError);
		else
			this.stack = (new Error(message)).stack;
	}
}

@Injectable({
  providedIn: 'root'
})
export class SignalingService  {

  peerId: string;
  roomId: string;
  _signalingSocket: Socket;
  _signalingUrl: string;
  _closed = false;

  onDisconnected: Subject<any> = new Subject()
  onReconnecting: Subject<any> = new Subject()
  onReconnected: Subject<any> = new Subject()
  onNewConsumer: Subject<any> = new Subject();
  onNotification: Subject<any> = new Subject();
  constructor(private logger: LogService ) {

   }


  init(token) {

    this._closed = false;
    this._signalingUrl;
    this._signalingSocket = io(token)


		this._signalingSocket.on('connect', () => {});

    this._signalingSocket.on('disconnect', (reason) =>
		{
			if (this._closed)
				return;

			if (reason === 'io server disconnect')
			{
        this.onDisconnected.next(null);
				this.close();
				return;
			}

      this.onReconnecting.next(null);
		});

    this._signalingSocket.on('reconnect_failed', () =>
		{
			this.logger.warn('signaling Peer "reconnect_failed" event');

      this.onDisconnected.next()

			this.close();
    });


		this._signalingSocket.on('reconnect', (attemptNumber) =>
		{
      this.onReconnected.next(attemptNumber)
		});



		this._signalingSocket.on('request', async (request, cb) =>
		{

			switch (request.method)
			{
				case 'newConsumer':
				{
            this.onNewConsumer.next(request.data);
            cb()

					break;
				}

				default:
				{
					this.logger.error('unknown request.method "%s"', request.method);

					cb(500, `unknown request.method "${request.method}"`);
				}
			}
		});

    this._signalingSocket.on('notification', (notification) => {
      this.onNotification.next(notification)

    });



  }
  close() {
    if (this._closed)
      return;

    this._closed = true;


    this._signalingSocket?.close();
    this._signalingSocket = null;


  }
	timeoutCallback(callback)
	{
		let called = false;

		const interval = setTimeout(
			() =>
			{
				if (called)
					return;
				called = true;
				callback(new SocketTimeoutError('Request timed out'));
			},
			requestTimeout
		);

		return (...args) =>
		{
			if (called)
				return;
			called = true;
			clearTimeout(interval);

			callback(...args);
		};
	}

	_sendRequest(method, data)
	{
		return new Promise((resolve, reject) =>
		{
			if (!this._signalingSocket)
			{
				reject('No socket connection');
			}
			else
			{
				this._signalingSocket.emit(
					'request',
					{ method, data },
					this.timeoutCallback((err, response) =>
					{
						if (err)
							reject(err);
						else
							resolve(response);
					})
				);
			}
		});
  }


	public async sendRequest(method, data?):Promise<any>
	{
		const requestRetries = 3


		for (let tries = 0; tries < requestRetries; tries++)
		{
			try
			{
				return await this._sendRequest(method, data);
			}
			catch (error)
			{
				if (
					error instanceof SocketTimeoutError &&
					tries < requestRetries
				)
					this.logger.warn('sendRequest() | timeout, retrying [attempt:"%s"]', tries);
				else
					throw error;
			}
		}
	}

}
