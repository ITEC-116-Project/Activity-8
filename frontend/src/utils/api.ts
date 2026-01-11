import { User, Room, Message } from '../types';

const API_URL = 'http://localhost:5000/api';

interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

interface RoomsResponse {
  success: boolean;
  rooms: Room[];
}

interface MessagesResponse {
  success: boolean;
  messages: Message[];
}

interface MessageResponse {
  success: boolean;
  message: Message;
}

export const loginUser = async (username: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  return response.json();
};

export const logoutUser = async (userId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  return response.json();
};

export const getRooms = async (): Promise<RoomsResponse> => {
  const response = await fetch(`${API_URL}/rooms`);
  return response.json();
};

export const createRoom = async (name: string): Promise<{ success: boolean; room: Room }> => {
  const response = await fetch(`${API_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return response.json();
};

export const deleteRoom = async (roomId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/rooms/${roomId}`, {
    method: 'DELETE'
  });
  return response.json();
};

export const getMessages = async (roomId: string): Promise<MessagesResponse> => {
  const response = await fetch(`${API_URL}/messages/${roomId}`);
  return response.json();
};

export const sendMessage = async (
  roomId: string,
  text: string,
  sender: string
): Promise<MessageResponse> => {
  const response = await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, text, sender })
  });
  return response.json();
};