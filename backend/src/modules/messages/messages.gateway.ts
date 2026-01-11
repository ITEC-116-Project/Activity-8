import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
})
export class MessagesGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messagesService: MessagesService) {}

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(roomId);
    console.log(`Client ${client.id} joined room ${roomId}`);
    return { event: 'joined', roomId };
  }

  @SubscribeMessage('send-message')
  handleSendMessage(@MessageBody() data: any) {
    const message = this.messagesService.create(data);
    this.server.to(data.roomId).emit('receive-message', message);
    return message;
  }

  @SubscribeMessage('message-delivered')
  handleMessageDelivered(@MessageBody() data: { messageId: string; roomId: string; username: string }) {
    const message = this.messagesService.markAsDelivered(data.messageId, data.roomId, data.username);
    if (message) {
      this.server.to(data.roomId).emit('message-delivery-update', message);
    }
  }

  @SubscribeMessage('message-read')
  handleMessageRead(@MessageBody() data: { messageId: string; roomId: string; username: string }) {
    const message = this.messagesService.markAsRead(data.messageId, data.roomId, data.username);
    if (message) {
      this.server.to(data.roomId).emit('message-read-update', message);
    }
  }

  @SubscribeMessage('edit-message')
  handleEditMessage(@MessageBody() data: { messageId: string; roomId: string; sender: string; text: string }) {
    const message = this.messagesService.update(data.messageId, data.roomId, data.sender, data.text);
    this.server.to(data.roomId).emit('message-edited', message);
    return message;
  }

  @SubscribeMessage('delete-message')
  handleDeleteMessage(@MessageBody() data: { messageId: string; roomId: string; sender: string }) {
    this.messagesService.delete(data.messageId, data.roomId, data.sender);
    this.server.to(data.roomId).emit('message-deleted', { messageId: data.messageId, roomId: data.roomId });
    return { success: true };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(roomId);
    console.log(`Client ${client.id} left room ${roomId}`);
    return { event: 'left', roomId };
  }
}