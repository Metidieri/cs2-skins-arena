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
import { Listing } from '../models/market.model';
import { RouletteBet, RouletteResult, RouletteRound } from '../models/roulette.model';

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

  identify(userId: number | string): void {
    this.socket.emit('identify', userId);
  }
  unidentify(userId: number | string): void {
    this.socket.emit('unidentify', userId);
  }
  onBoxOpened(): Observable<{ skin: any; coinsValue: number; isNewRecord: boolean }> {
    return new Observable((subscriber) => {
      const handler = (payload: any) => subscriber.next(payload);
      this.socket.on('box:opened', handler);
      return () => this.socket.off('box:opened', handler);
    });
  }

  onLeveledUp(): Observable<{ level: number; xpGained: number; currentXp: number; xpNeeded: number }> {
    return new Observable((subscriber) => {
      const handler = (payload: any) => subscriber.next(payload);
      this.socket.on('user:leveled-up', handler);
      return () => this.socket.off('user:leveled-up', handler);
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

  joinMarketplace(): void {
    this.socket.emit('join-marketplace');
  }

  leaveMarketplace(): void {
    this.socket.emit('leave-marketplace');
  }

  onMarketListed(): Observable<Listing> {
    return new Observable<Listing>((subscriber) => {
      const handler = (payload: Listing) => subscriber.next(payload);
      this.socket.on('market:listed', handler);
      return () => {
        this.socket.off('market:listed', handler);
      };
    });
  }

  onMarketSold(): Observable<Listing> {
    return new Observable<Listing>((subscriber) => {
      const handler = (payload: Listing) => subscriber.next(payload);
      this.socket.on('market:sold', handler);
      return () => {
        this.socket.off('market:sold', handler);
      };
    });
  }

  onMarketCancelled(): Observable<Listing> {
    return new Observable<Listing>((subscriber) => {
      const handler = (payload: Listing) => subscriber.next(payload);
      this.socket.on('market:cancelled', handler);
      return () => {
        this.socket.off('market:cancelled', handler);
      };
    });
  }

  joinRoulette(): void { this.socket.emit('join-roulette'); }
  leaveRoulette(): void { this.socket.emit('leave-roulette'); }

  onRouletteNewRound(): Observable<RouletteRound & { consecutiveGreens: number; accumulatedJackpot: number }> {
    return new Observable((subscriber) => {
      const handler = (payload: any) => subscriber.next(payload);
      this.socket.on('roulette:new_round', handler);
      return () => this.socket.off('roulette:new_round', handler);
    });
  }

  onRouletteTimer(): Observable<number> {
    return new Observable<number>((subscriber) => {
      const handler = (seconds: number) => subscriber.next(seconds);
      this.socket.on('roulette:timer', handler);
      return () => this.socket.off('roulette:timer', handler);
    });
  }

  onRouletteBetPlaced(): Observable<RouletteBet> {
    return new Observable<RouletteBet>((subscriber) => {
      const handler = (payload: RouletteBet) => subscriber.next(payload);
      this.socket.on('roulette:bet_placed', handler);
      return () => this.socket.off('roulette:bet_placed', handler);
    });
  }

  onRouletteResult(): Observable<RouletteResult> {
    return new Observable<RouletteResult>((subscriber) => {
      const handler = (payload: RouletteResult) => subscriber.next(payload);
      this.socket.on('roulette:result', handler);
      return () => this.socket.off('roulette:result', handler);
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
