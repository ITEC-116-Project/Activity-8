export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

export interface Room {
  id: string;
  name: string;
  members: number;
  createdAt: Date;
}

export interface Message {
  id: string;
  roomId: string;
  text: string;
  sender: string;
  timestamp: string;
  createdAt: Date;
}

export interface LoginRequest {
  username: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface RoomRequest {
  name: string;
}

export interface MessageRequest {
  roomId: string;
  text: string;
  sender: string;
}