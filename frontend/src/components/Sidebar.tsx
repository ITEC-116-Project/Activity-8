import React, { useState } from 'react';
import { Users, Plus, LogOut, Trash2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
}

interface Room {
  id: string;
  name: string;
  members: number;
  membersList?: string[];
  admin?: string | null;
  pendingRequests?: string[];
}

interface SidebarProps {
  user: User;
  rooms: Room[];
  currentRoom: Room | null;
  onJoinRoom: (room: Room) => void;
  onLogout: () => void;
  onRoomsUpdate: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  rooms,
  currentRoom,
  onJoinRoom,
  onLogout,
  onRoomsUpdate
}) => {
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreateRoom = async () => {
    if (newRoomName.trim()) {
      try {
        const response = await fetch('http://localhost:5000/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newRoomName, creator: user.username })
        });
        const data = await response.json();
        if (data.success) {
          setNewRoomName('');
          setShowNewRoomModal(false);
          onRoomsUpdate();
        }
      } catch (error) {
        console.error('Failed to create room:', error);
      }
    }
  };

  interface RequestUser { id: string; name: string; email: string }
  const [requestModalRoom, setRequestModalRoom] = useState<Room | null>(null);
  const [roomRequests, setRoomRequests] = useState<RequestUser[]>([]);
  const [joinStatusModalRoom, setJoinStatusModalRoom] = useState<Room | null>(null);
  const [joinStatusMessage, setJoinStatusMessage] = useState<string | null>(null);
  const [confirmJoinRoom, setConfirmJoinRoom] = useState<Room | null>(null);

  const openRequestsModal = async (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${room.id}/requests`);
      const data = await res.json();
      if (data.success) {
        const pending: string[] = data.requests || [];
        // fetch users and map pending to user profiles
        const usersRes = await fetch('http://localhost:5000/user-crud');
        const usersData = await usersRes.json();
        const allUsers = usersData || [];
        const mapped: RequestUser[] = pending.map(p => {
          const found = allUsers.find((u: any) => (u.email === p || u.name === p || u.email === p));
          if (found) return { id: String(found.id), name: found.name, email: found.email };
          return { id: p, name: p, email: '' };
        });

        setRoomRequests(mapped);
        setRequestModalRoom(room);
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const approveRequest = async (roomId: string, username: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/requests/${username}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onRoomsUpdate();
        // refresh requests list in modal
        const updated = roomRequests.filter(r => r.email !== username && r.name !== username && r.id !== username);
        setRoomRequests(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const declineRequest = async (roomId: string, username: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/requests/${username}/decline`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onRoomsUpdate();
        const updated = roomRequests.filter(r => r.email !== username && r.name !== username && r.id !== username);
        setRoomRequests(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendJoinRequest = async (room: Room) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${room.id}/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      const data = await res.json();
      if (data.success) {
        setJoinStatusModalRoom(room);
        setJoinStatusMessage('Your request to join this room is pending approval.');
        onRoomsUpdate();
      }
    } catch (err) {
      console.error('Failed to request join', err);
    }
  };

  const tryEnterRoom = async (room: Room) => {
    const isMember = room.membersList?.includes(user.username);
    const isPending = room.pendingRequests?.includes(user.username);
    if (isMember) {
      onJoinRoom(room);
      return;
    }

    if (isPending) {
      setJoinStatusModalRoom(room);
      setJoinStatusMessage('Your request to join this room is pending approval.');
      return;
    }
    // ask for confirmation before sending a join request
    setConfirmJoinRoom(room);
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        onRoomsUpdate();
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  return (
    <>
      <div style={{
        width: '320px',
        background: 'linear-gradient(180deg, #051937 0%, #0a2744 100%)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '24px 0 0 24px'
      }}>
        {/* User Header */}
        <div style={{ padding: '30px 25px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                color: 'white',
                fontSize: '18px'
              }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>
                  {user.username}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }} aria-label="online" title="online">
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <LogOut size={18} color="white" />
            </button>
          </div>
        </div>

        {/* Rooms Header */}
        <div style={{
          padding: '25px 25px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '600' }}>
            Chat Rooms
          </h3>
          <button
            onClick={() => setShowNewRoomModal(true)}
            style={{
              background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
              border: 'none',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} color="white" />
          </button>
        </div>

        {/* Rooms List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 15px 15px' }}>
          {rooms.map(room => (
            <div
              key={room.id}
              onClick={() => tryEnterRoom(room)}
              style={{
                padding: '16px 18px',
                margin: '8px 0',
                borderRadius: '12px',
                cursor: 'pointer',
                background: currentRoom?.id === room.id ? 'rgba(15, 118, 110, 0.2)' : 'transparent',
                border: currentRoom?.id === room.id ? '1px solid rgba(15, 118, 110, 0.3)' : '1px solid transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ color: 'white', fontWeight: '500', marginBottom: '4px', fontSize: '15px' }}>
                  {room.name}
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <Users size={13} />
                  {room.members} members
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {room.admin === user.username && room.pendingRequests && room.pendingRequests.length > 0 && (
                  <button
                    onClick={(e) => openRequestsModal(room, e)}
                    title="View join requests"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: '8px',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white'
                    }}
                  >
                    <Users size={14} />
                  </button>
                )}

                <button
                  onClick={(e) => handleDeleteRoom(room.id, e)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowNewRoomModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            width: '100%',
            maxWidth: '450px'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#051937' }}>
              Create New Room
            </h3>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name"
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: '15px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNewRoomModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests Modal (admin) */}
      {requestModalRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setRequestModalRoom(null)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            width: '100%',
            maxWidth: '420px'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0' }}>Join Requests for {requestModalRoom.name}</h3>
            {roomRequests.length === 0 ? (
              <div style={{ padding: '16px', color: '#64748b' }}>No pending requests</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {roomRequests.map(r => {
                  const initials = r && r.name ? r.name.charAt(0).toUpperCase() : '?';
                  const displayEmail = r && r.email ? r.email : '';
                  const identifier = r && (r.email || r.name || r.id) as string;
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: '#eef2ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          color: '#4f46e5'
                        }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{displayEmail}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => approveRequest(requestModalRoom.id, identifier)} style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Approve</button>
                        <button onClick={() => declineRequest(requestModalRoom.id, identifier)} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Decline</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button onClick={() => setRequestModalRoom(null)} style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Join status modal for users who requested to join */}
      {joinStatusModalRoom && joinStatusMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(99,102,241,0.18), rgba(99,102,241,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }} onClick={() => { setJoinStatusModalRoom(null); setJoinStatusMessage(null); }}>
          <div style={{ width: '92%', maxWidth: '620px', padding: '18px', borderRadius: '18px', background: 'transparent' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '22px 20px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(2,6,23,0.12)' }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '14px', background: 'linear-gradient(180deg,#ffb366,#ff6b2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,107,46,0.18)' }}>
                {/* clock icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 7V12L15.5 14.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>{joinStatusModalRoom.name}</div>
                <div style={{ color: '#475569', fontSize: '15px' }}>{joinStatusMessage}</div>
              </div>

              <div style={{ marginLeft: '8px' }}>
                <button
                  onClick={() => { setJoinStatusModalRoom(null); setJoinStatusMessage(null); }}
                  style={{
                    padding: '10px 20px',
                    background: '#eef2ff',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(15,23,42,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.background = '#e6f0ff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLButtonElement).style.background = '#eef2ff';
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Join Modal */}
      {confirmJoinRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }} onClick={() => setConfirmJoinRoom(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0' }}>Join {confirmJoinRoom.name}?</h3>
            <p style={{ color: '#475569' }}>Do you want to join this group chat? The admin will review your request.</p>
            <div style={{ marginTop: '18px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmJoinRoom(null)} style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px' }}>Cancel</button>
              <button onClick={() => { sendJoinRequest(confirmJoinRoom); setConfirmJoinRoom(null); }} style={{ padding: '8px 12px', background: 'linear-gradient(135deg,#0f766e,#14b8a6)', color: 'white', border: 'none', borderRadius: '8px' }}>Request to Join</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;