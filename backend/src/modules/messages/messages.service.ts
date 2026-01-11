import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';

export interface MessageReadReceipt {
  username: string;
  readAt: Date;
}

export interface ReplyTo {
  messageId: string;
  text: string;
  sender: string;
}

export interface Message {
  id: string;
  roomId: string;
  text: string;
  sender: string;
  timestamp: string;
  createdAt: Date;
  editedAt?: Date;
  isEdited?: boolean;
  deliveredTo?: string[];
  readBy?: MessageReadReceipt[];
  replyTo?: ReplyTo;
}

@Injectable()
export class MessagesService {
  private messages: Map<string, Message[]> = new Map();

  findByRoom(roomId: string): Message[] {
    return this.messages.get(roomId) || [];
  }

  create(createMessageDto: CreateMessageDto): Message {
    const message: Message = {
      id: Date.now().toString(),
      roomId: createMessageDto.roomId,
      text: createMessageDto.text.trim(),
      sender: createMessageDto.sender,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
      isEdited: false,
      deliveredTo: [],
      readBy: [],
    };

    // Add replyTo if it exists
    if ((createMessageDto as any).replyTo) {
      message.replyTo = (createMessageDto as any).replyTo;
    }

    if (!this.messages.has(createMessageDto.roomId)) {
      this.messages.set(createMessageDto.roomId, []);
    }

    this.messages.get(createMessageDto.roomId)?.push(message);
    return message;
  }

  // Mark message as delivered
  markAsDelivered(messageId: string, roomId: string, username: string): Message | null {
    const roomMessages = this.messages.get(roomId);
    if (!roomMessages) return null;

    const message = roomMessages.find(m => m.id === messageId);
    if (!message) return null;

    // Don't add sender to deliveredTo
    if (message.sender === username) return message;

    if (!message.deliveredTo) {
      message.deliveredTo = [];
    }

    if (!message.deliveredTo.includes(username)) {
      message.deliveredTo.push(username);
    }

    return message;
  }

  // Mark message as read
  markAsRead(messageId: string, roomId: string, username: string): Message | null {
    const roomMessages = this.messages.get(roomId);
    if (!roomMessages) return null;

    const message = roomMessages.find(m => m.id === messageId);
    if (!message) return null;

    // Don't add sender to readBy
    if (message.sender === username) return message;

    if (!message.readBy) {
      message.readBy = [];
    }

    const alreadyRead = message.readBy.some(r => r.username === username);
    if (!alreadyRead) {
      message.readBy.push({
        username,
        readAt: new Date()
      });
    }

    return message;
  }

  update(messageId: string, roomId: string, sender: string, newText: string): Message {
    const roomMessages = this.messages.get(roomId);
    if (!roomMessages) {
      throw new NotFoundException('Room not found');
    }

    const messageIndex = roomMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      throw new NotFoundException('Message not found');
    }

    const message = roomMessages[messageIndex];
    
    if (message.sender !== sender) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.text = newText.trim();
    message.isEdited = true;
    message.editedAt = new Date();

    roomMessages[messageIndex] = message;
    this.messages.set(roomId, roomMessages);

    return message;
  }

  delete(messageId: string, roomId: string, sender: string): void {
    const roomMessages = this.messages.get(roomId);
    if (!roomMessages) {
      throw new NotFoundException('Room not found');
    }

    const messageIndex = roomMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      throw new NotFoundException('Message not found');
    }

    const message = roomMessages[messageIndex];
    
    if (message.sender !== sender) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    roomMessages.splice(messageIndex, 1);
    this.messages.set(roomId, roomMessages);
  }

  deleteByRoom(roomId: string): void {
    this.messages.delete(roomId);
  }
}