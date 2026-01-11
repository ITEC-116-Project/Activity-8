import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll() {
    const rooms = this.roomsService.findAll();
    return { success: true, rooms };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const room = this.roomsService.findOne(id);
    return { success: true, room };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRoomDto: CreateRoomDto) {
    const room = this.roomsService.create(createRoomDto as any);
    return { success: true, room };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    this.roomsService.remove(id);
    return { success: true, message: 'Room deleted successfully' };
  }

  // Request to join a room (adds to pending requests)
  @Post(':id/join-request')
  @HttpCode(HttpStatus.OK)
  requestToJoin(@Param('id') id: string, @Body() body: { username: string }) {
    const { username } = body;
    this.roomsService.addJoinRequest(id, username);
    return { success: true, message: 'Join request submitted' };
  }

  // Get pending requests for a room (admin can view)
  @Get(':id/requests')
  getRequests(@Param('id') id: string) {
    const room = this.roomsService.findOne(id);
    return { success: true, requests: room.pendingRequests };
  }

  // Approve a pending request
  @Post(':id/requests/:username/approve')
  approveRequest(@Param('id') id: string, @Param('username') username: string) {
    this.roomsService.approveRequest(id, username);
    return { success: true, message: 'Request approved' };
  }

  // Decline a pending request
  @Post(':id/requests/:username/decline')
  declineRequest(@Param('id') id: string, @Param('username') username: string) {
    this.roomsService.declineRequest(id, username);
    return { success: true, message: 'Request declined' };
  }

  // Get members for a room
  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    const members = this.roomsService.getMembers(id);
    return { success: true, members };
  }

  // Kick a member from a room (admin action)
  @Post(':id/members/:username/kick')
  kickMember(@Param('id') id: string, @Param('username') username: string) {
    this.roomsService.kickMember(id, username);
    return { success: true, message: 'Member kicked' };
  }
}