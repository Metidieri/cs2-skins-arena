import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Battle, BattleResolvedEvent } from '../models/battle.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }

  joinLobby(): void {
    this.socket.emit('join-lobby');
  }

  leaveLobby(): void {
    this.socket.emit('leave-lobby');
  }

  joinBattle(id: string): void {
    this.socket.emit('join-battle', id);
  }

  leaveBattle(id: string): void {
    this.socket.emit('leave-battle', id);
  }

  onBattleCreated(): Observable<Battle> {
    return new Observable<Battle>((subscriber) => {
      const handler = (payload: Battle) => subscriber.next(payload);
      this.socket.on('battle:created', handler);
      return () => {
        this.socket.off('battle:created', handler);
      };
    });
  }

  onBattleResolved(): Observable<BattleResolvedEvent> {
    return new Observable<BattleResolvedEvent>((subscriber) => {
      const handler = (payload: BattleResolvedEvent) => subscriber.next(payload);
      this.socket.on('battle:resolved', handler);
      return () => {
        this.socket.off('battle:resolved', handler);
      };
    });
  }

  onBattleUpdated(): Observable<Battle> {
    return new Observable<Battle>((subscriber) => {
      const handler = (payload: Battle) => subscriber.next(payload);
      this.socket.on('battle:updated', handler);
      return () => {
        this.socket.off('battle:updated', handler);
      };
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
