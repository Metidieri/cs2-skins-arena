export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { id: number; username: string; level: number };
}
