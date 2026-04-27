import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { ChatMessage } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private socket: Socket;

  constructor(private http: HttpClient) {
    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }

  getHistory(): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiUrl}/chat/history`);
  }

  joinChat(): void {
    this.socket.emit('chat:join');
  }

  sendMessage(content: string, token: string): void {
    this.socket.emit('chat:message', { token, content });
  }

  onMessage(): Observable<ChatMessage> {
    return new Observable<ChatMessage>((subscriber) => {
      const handler = (msg: ChatMessage) => subscriber.next(msg);
      this.socket.on('chat:message', handler);
      return () => this.socket.off('chat:message', handler);
    });
  }
}
