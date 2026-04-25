import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Battle, BattleResolvedEvent } from '../models/battle.model';
import {
  JackpotEntry,
  JackpotEntryEvent,
  JackpotResolvedEvent,
  JackpotTimerEvent,
} from '../models/jackpot.model';

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

  joinJackpot(): void {
    this.socket.emit('join-jackpot');
  }

  leaveJackpot(): void {
    this.socket.emit('leave-jackpot');
  }

  onJackpotEntry(): Observable<JackpotEntry> {
    return new Observable<JackpotEntry>((subscriber) => {
      const handler = (payload: JackpotEntry | JackpotEntryEvent) => {
        const entry = (payload as JackpotEntryEvent).entry || (payload as JackpotEntry);
        subscriber.next(entry);
      };
      this.socket.on('jackpot:entry', handler);
      return () => {
        this.socket.off('jackpot:entry', handler);
      };
    });
  }

  onJackpotResolved(): Observable<JackpotResolvedEvent> {
    return new Observable<JackpotResolvedEvent>((subscriber) => {
      const handler = (payload: JackpotResolvedEvent) => subscriber.next(payload);
      this.socket.on('jackpot:resolved', handler);
      return () => {
        this.socket.off('jackpot:resolved', handler);
      };
    });
  }

  onJackpotNew(): Observable<void> {
    return new Observable<void>((subscriber) => {
      const handler = () => subscriber.next();
      this.socket.on('jackpot:new', handler);
      return () => {
        this.socket.off('jackpot:new', handler);
      };
    });
  }

  onJackpotTimer(): Observable<number> {
    return new Observable<number>((subscriber) => {
      const handler = (payload: JackpotTimerEvent | number) => {
        const seconds =
          typeof payload === 'number' ? payload : payload?.seconds ?? 0;
        subscriber.next(seconds);
      };
      this.socket.on('jackpot:timer', handler);
      return () => {
        this.socket.off('jackpot:timer', handler);
      };
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
