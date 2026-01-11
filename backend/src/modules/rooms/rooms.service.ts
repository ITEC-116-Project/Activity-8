import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';

export interface Room {
  id: string;
  name: string;
  // list of member usernames
  membersList: string[];
  // computed members count (for backwards compatibility)
  members: number;
  // username of the room admin (creator)
  admin?: string | null;
  // pending join requests (usernames)
  pendingRequests: string[];
  createdAt: Date;
}

@Injectable()
export class RoomsService {
  // Start with no pre-created rooms. Rooms are created by users via the API.
  private rooms: Map<string, Room> = new Map();

  findAll(): Room[] {
    // ensure members count is in sync with membersList
    return Array.from(this.rooms.values()).map(r => ({ ...r, members: r.membersList.length }));
  }

  findOne(id: string): Room {
    const room = this.rooms.get(id);
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return { ...room, members: room.membersList.length };
  }

  create(createRoomDto: CreateRoomDto): Room {
    const roomId = Date.now().toString();
    const creator = (createRoomDto as any).creator;
    const membersList = creator ? [creator] : [];
    const newRoom: Room = {
      id: roomId,
      name: createRoomDto.name.trim(),
      membersList,
      members: membersList.length,
      admin: creator || null,
      pendingRequests: [],
      createdAt: new Date(),
    };

    this.rooms.set(roomId, newRoom);
    return { ...newRoom };
  }

  // Add a join request for a username
  addJoinRequest(roomId: string, username: string): void {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');
    if (room.membersList.includes(username)) return; // already member
    if (!room.pendingRequests.includes(username)) {
      room.pendingRequests.push(username);
      this.rooms.set(roomId, room);
    }
  }

  // Approve a pending request and add user to members
  approveRequest(roomId: string, username: string): void {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');
    const idx = room.pendingRequests.indexOf(username);
    if (idx !== -1) {
      room.pendingRequests.splice(idx, 1);
      if (!room.membersList.includes(username)) room.membersList.push(username);
      room.members = room.membersList.length;
      this.rooms.set(roomId, room);
    }
  }

  // Decline a pending request
  declineRequest(roomId: string, username: string): void {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');
    const idx = room.pendingRequests.indexOf(username);
    if (idx !== -1) {
      room.pendingRequests.splice(idx, 1);
      this.rooms.set(roomId, room);
    }
  }

  // Get members list (usernames/emails)
  getMembers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');
    return room.membersList || [];
  }

  // Kick a member from the room
  kickMember(roomId: string, username: string): void {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');

    // Prevent kicking the admin
    if (room.admin && room.admin === username) {
      return;
    }

    const idx = room.membersList.indexOf(username);
    if (idx !== -1) {
      room.membersList.splice(idx, 1);
      room.members = room.membersList.length;
      this.rooms.set(roomId, room);
    }
  }

  remove(id: string): void {
    const deleted = this.rooms.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
  }
}