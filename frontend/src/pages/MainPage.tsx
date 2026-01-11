import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';

interface User {
  id: string;
  username: string;
}

interface Room {
  id: string;
  name: string;
  members: number;
}

interface Message {
  id: string;
  roomId?: string;
  text: string;
  sender: string;
  timestamp: string;
  isMine?: boolean;
  isSystem?: boolean;
  isEdited?: boolean;
}

interface MainPageProps {
  user: User;
  onLogout: () => void;
}

const socket: Socket = io('http://localhost:5000');

const MainPage: React.FC<MainPageProps> = ({ user, onLogout }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});

useEffect(() => {
  fetchRooms();

  socket.on('receive-message', (message: Message) => {
    if (message.roomId) {
      setMessages(prev => ({
        ...prev,
        [message.roomId!]: [...(prev[message.roomId!] || []), message]
      }));
    }
  });

  socket.on('message-delivery-update', (updatedMessage: Message) => {
    if (updatedMessage.roomId) {
      setMessages(prev => ({
        ...prev,
        [updatedMessage.roomId!]: prev[updatedMessage.roomId!]?.map(msg =>
          msg.id === updatedMessage.id ? updatedMessage : msg
        ) || []
      }));
    }
  });

  socket.on('message-read-update', (updatedMessage: Message) => {
    if (updatedMessage.roomId) {
      setMessages(prev => ({
        ...prev,
        [updatedMessage.roomId!]: prev[updatedMessage.roomId!]?.map(msg =>
          msg.id === updatedMessage.id ? updatedMessage : msg
        ) || []
      }));
    }
  });

  socket.on('message-edited', (editedMessage: Message) => {
    if (editedMessage.roomId) {
      setMessages(prev => ({
        ...prev,
        [editedMessage.roomId!]: prev[editedMessage.roomId!]?.map(msg =>
          msg.id === editedMessage.id ? { ...editedMessage, isEdited: true } : msg
        ) || []
      }));
    }
  });

  socket.on('message-deleted', (data: { messageId: string; roomId: string }) => {
    setMessages(prev => ({
      ...prev,
      [data.roomId]: prev[data.roomId]?.filter(msg => msg.id !== data.messageId) || []
    }));
  });

  return () => {
    socket.off('receive-message');
    socket.off('message-delivery-update');
    socket.off('message-read-update');
    socket.off('message-edited');
    socket.off('message-deleted');
  };
}, []);

// Periodically refresh room list so member counts stay up-to-date
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms');
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
        setCurrentRoom(prev => {
          if (!prev) return prev;
          const updated = data.rooms.find((r: Room) => r.id === prev.id);
          return updated || prev;
        });
      }
    } catch (err) {
      console.error('Failed to refresh rooms:', err);
    }
  }, 8000); // every 8s

  return () => clearInterval(interval);
}, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms');
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
        // If we have a currentRoom selected, update its object so member counts stay in sync
        if (currentRoom) {
          const updated = data.rooms.find((r: Room) => r.id === currentRoom.id);
          if (updated) setCurrentRoom(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleJoinRoom = async (room: Room) => {
    // Leave previous room if any
    if (currentRoom) {
      try {
        socket.emit('leave-room', currentRoom.id);
      } catch (err) {
        // ignore
      }
    }

    setCurrentRoom(room);
    socket.emit('join-room', room.id);

    // update rooms (member counts) immediately after joining
    fetchRooms();

    if (!messages[room.id]) {
      try {
        const response = await fetch(`http://localhost:5000/api/messages/${room.id}`);
        const data = await response.json();
        if (data.success) {
          setMessages(prev => ({
            ...prev,
            [room.id]: data.messages
          }));
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '24px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      maxWidth: '1400px',
      width: '100%',
      height: '85vh',
      display: 'flex',
      overflow: 'hidden',
      backdropFilter: 'blur(10px)'
    }}>
      <Sidebar
        user={user}
        rooms={rooms}
        currentRoom={currentRoom}
        onJoinRoom={handleJoinRoom}
        onLogout={onLogout}
        onRoomsUpdate={fetchRooms}
      />
      <ChatArea
        currentRoom={currentRoom}
        messages={messages[currentRoom?.id || ''] || []}
        user={user}
        socket={socket}
      />
    </div>
  );
};

export default MainPage;