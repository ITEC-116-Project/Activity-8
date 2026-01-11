export interface User {
  id: string;
  username: string;
}

export interface Room {
  id: string;
  name: string;
  members: number;
}

export interface MessageReadReceipt {
  username: string;
  readAt: string;
}

export interface Message {
  id: string;
  roomId?: string;
  text: string;
  sender: string;
  timestamp: string;
  isMine?: boolean;
  isSystem?: boolean;
  isEdited?: boolean;
  deliveredTo?: string[];
  readBy?: MessageReadReceipt[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}