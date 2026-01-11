import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':roomId')
  findByRoom(@Param('roomId') roomId: string) {
    const messages = this.messagesService.findByRoom(roomId);
    return { success: true, messages };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createMessageDto: CreateMessageDto) {
    const message = this.messagesService.create(createMessageDto);
    return { success: true, message };
  }

  // Edit message
  @Put(':messageId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('messageId') messageId: string,
    @Body() body: { roomId: string; sender: string; text: string }
  ) {
    const message = this.messagesService.update(messageId, body.roomId, body.sender, body.text);
    return { success: true, message };
  }

  // Delete message
  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  delete(
    @Param('messageId') messageId: string,
    @Body() body: { roomId: string; sender: string }
  ) {
    this.messagesService.delete(messageId, body.roomId, body.sender);
    return { success: true, message: 'Message deleted successfully' };
  }
}