import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Users, Send, Edit2, Trash2, X, Check, CornerDownLeft, Reply } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getUserColor, getUserInitials } from '../utils/userColors';

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
}

interface MessageReadReceipt {
  username: string;
  readAt: string;
}

interface Message {
  id: string;
  roomId?: string;
  text: string;
  sender: string;
  timestamp: string;
  isMine?: boolean;
  isEdited?: boolean;
  isSystem?: boolean;
  readBy?: MessageReadReceipt[];
  deliveredTo?: string[];
  replyTo?: { messageId: string; text?: string; sender?: string } | null;
}

// Helper to format timestamps
const formatTimestamp = (ts: string) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(ts);
  }
};

// Component props
type ChatAreaProps = {
  messages: Message[];
  currentRoom: Room | null;
  user: User;
  socket: Socket;
};

const ChatArea: React.FC<ChatAreaProps> = ({ messages, currentRoom, user, socket }) => {
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const prevMessagesLengthRef = useRef(messages.length);

  // Members modal state + helper to fetch members (robust to varied backend shapes)
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersList, setMembersList] = useState<Array<{ id?: string; name?: string; email?: string }>>([]);
  const [rawMembers, setRawMembers] = useState<any[]>([]);

  const fetchMembers = async () => {
    if (!currentRoom) return;
    setMembersLoading(true);
    setMembersError(null);
    setMembersList([]);
    setRawMembers([]);
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${currentRoom.id}/members`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to fetch members: ${txt}`);
      }
      const data = await res.json();

      // Normalize response: server might return an array, or { members: [...] }, or { membersList: [...] }
      let list: any[] = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray((data as any).members)) list = (data as any).members;
      else if (Array.isArray((data as any).membersList)) list = (data as any).membersList;
      else if (Array.isArray((data as any).data)) list = (data as any).data;
      else list = [];

      const profiles: any[] = [];
      const raws: any[] = [];
      for (const item of list) {
        if (!item) continue;
        if (typeof item === 'string') {
          raws.push(item);
        } else if (typeof item === 'object' && (item.name || item.email || item.id)) {
          profiles.push(item);
        } else {
          raws.push(item);
        }
      }

      // If we only got identifiers (strings), try to map them using /user-crud if available
      if (profiles.length === 0 && raws.length > 0) {
        try {
          const res2 = await fetch('http://localhost:5000/user-crud');
          if (res2.ok) {
            const users = await res2.json();
            const mapped = raws.map((identifier) => {
              const found = users.find((u: any) => String(u.email) === String(identifier) || String(u.name) === String(identifier) || String(u.id) === String(identifier));
              return found || { id: identifier, name: String(identifier), email: '' };
            });
            setMembersList(mapped);
            setRawMembers([]);
          } else {
            setMembersList([]);
            setRawMembers(raws);
          }
        } catch (e) {
          setMembersList([]);
          setRawMembers(raws);
        }
      } else {
        setMembersList(profiles);
        setRawMembers(raws);
      }
    } catch (err: any) {
      console.error(err);
      setMembersError(err?.message || 'Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      const { scrollTop, clientHeight, scrollHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const NEAR_BOTTOM_THRESHOLD = 150;

      // Check if new messages arrived
      if (messages.length > prevMessagesLengthRef.current) {
        const newMessagesCount = messages.length - prevMessagesLengthRef.current;
        
        if (distanceFromBottom < NEAR_BOTTOM_THRESHOLD) {
          // User is near bottom, auto-scroll
          scrollToBottom();
          setShowNewMessagesBadge(false);
          setUnreadCount(0);
        } else {
          // User is scrolled up, show badge
          setShowNewMessagesBadge(true);
          setUnreadCount(prev => prev + newMessagesCount);
        }
      }

      prevMessagesLengthRef.current = messages.length;
    });
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
    setShowNewMessagesBadge(false);
    setUnreadCount(0);
    prevMessagesLengthRef.current = messages.length;
  }, [currentRoom]);

  useEffect(() => {
    if (!currentRoom) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            const messageSender = entry.target.getAttribute('data-message-sender');
            
            if (messageId && messageSender !== user.username) {
              socket.emit('message-delivered', {
                messageId,
                roomId: currentRoom.id,
                username: user.username
              });

              setTimeout(() => {
                socket.emit('message-read', {
                  messageId,
                  roomId: currentRoom.id,
                  username: user.username
                });
              }, 500);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(messageRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [messages, currentRoom, user.username, socket]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentRoom) {
      const messageData = {
        roomId: currentRoom.id,
        text: newMessage,
        sender: user.username
      };

      if (replyTo) {
        (messageData as any).replyTo = {
          messageId: replyTo.id,
          text: replyTo.text,
          sender: replyTo.sender
        };
      }

      try {
        socket.emit('send-message', messageData);
        setNewMessage('');
        setReplyTo(null);
        
        // Auto-scroll to bottom when user sends a message
        setTimeout(() => {
          scrollToBottom();
          setShowNewMessagesBadge(false);
          setUnreadCount(0);
        }, 100);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleEditMessage = async (messageId: string) => {
    if (editText.trim() && currentRoom) {
      try {
        socket.emit('edit-message', {
          messageId,
          roomId: currentRoom.id,
          sender: user.username,
          text: editText
        });

        setEditingMessageId(null);
        setEditText('');
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    }
  };

  const openDeleteModal = (messageId: string) => {
    setDeleteCandidateId(messageId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteMessage = async () => {
    if (!currentRoom || !deleteCandidateId) {
      setDeleteModalOpen(false);
      setDeleteCandidateId(null);
      return;
    }
    try {
      socket.emit('delete-message', {
        messageId: deleteCandidateId,
        roomId: currentRoom.id,
        sender: user.username
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setDeleteModalOpen(false);
      setDeleteCandidateId(null);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    const input = document.querySelector('input[placeholder="Type your message..."]') as HTMLInputElement | null;
    if (input) input.focus();
  };

  const cancelReply = () => setReplyTo(null);

  const handleJumpToLatest = () => {
    scrollToBottom();
    setShowNewMessagesBadge(false);
    setUnreadCount(0);
  };

  const renderReadReceipts = (msg: Message) => {
    if (msg.isSystem) return null;

    const readBy = msg.readBy || [];
    const deliveredTo = msg.deliveredTo || [];
    const isGroupChat = (currentRoom?.members || 0) > 2;

    if (readBy.length > 0) {
      if (isGroupChat) {
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '4px',
            fontSize: '11px',
            color: '#94a3b8'
          }}>
            <span>Seen by</span>
            <div style={{ display: 'flex', marginLeft: '4px' }}>
              {readBy.slice(0, 3).map((receipt, index) => {
                const color = getUserColor(receipt.username);
                const initials = getUserInitials(receipt.username);
                return (
                  <div
                    key={receipt.username}
                    title={`${receipt.username} • ${formatTimestamp(receipt.readAt)}`}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: '700',
                      marginLeft: index > 0 ? '-8px' : '0',
                      border: '2px solid #f8fafc',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    {initials}
                  </div>
                );
              })}
              {readBy.length > 3 && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: '700',
                  marginLeft: '-8px',
                  border: '2px solid #f8fafc'
                }}>
                  +{readBy.length - 3}
                </div>
              )}
            </div>
          </div>
        );
      } else {
        return (
          <div style={{
            fontSize: '11px',
            color: '#3b82f6',
            marginTop: '4px',
            fontWeight: '500'
          }}>
            Read
          </div>
        );
      }
    } else if (deliveredTo.length > 0) {
      return (
        <div style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginTop: '4px'
        }}>
          Delivered
        </div>
      );
    } else {
      return (
        <div style={{
          fontSize: '11px',
          color: '#cbd5e1',
          marginTop: '4px'
        }}>
          Sent
        </div>
      );
    }
  };

  if (!currentRoom) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
        color: '#64748b',
        background: '#f8fafc'
      }}>
        <MessageCircle size={64} color="#cbd5e1" />
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#475569' }}>
          Select a room to start chatting
        </div>
        <div style={{ fontSize: '14px' }}>
          Choose a room from the sidebar or create a new one
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '25px 30px',
        borderBottom: '1px solid #e2e8f0',
        background: 'white'
      }}>
        <h2 style={{
          margin: '0 0 5px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: '#051937'
        }}>
          {currentRoom.name}
        </h2>
        <div style={{
          color: '#64748b',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Users size={16} />
          {currentRoom.members} members
          <button
            onClick={async () => { setMembersModalOpen(true); await fetchMembers(); }}
            style={{
              marginLeft: '12px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            View members
          </button>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '30px',
          background: '#f8fafc'
        }}
      >
        {messages.map(msg => {
          const userColor = getUserColor(msg.sender);
          const userInitials = getUserInitials(msg.sender);

          return (
            <div
              key={msg.id}
              ref={(el) => {
                if (el) {
                  messageRefs.current[msg.id] = el;
                }
              }}
              data-message-id={msg.id}
              data-message-sender={msg.sender}
              style={{
                display: 'flex',
                justifyContent: msg.sender === user.username ? 'flex-end' : 'flex-start',
                marginBottom: '16px',
                gap: '12px'
              }}
            >
              {msg.sender !== user.username && !msg.isSystem && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: userColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '14px',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}>
                  {userInitials}
                </div>
              )}

              <div style={{
                maxWidth: '60%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === user.username ? 'flex-end' : 'flex-start'
              }}>
                {!msg.isSystem && (
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: userColor,
                    marginBottom: '6px',
                    paddingLeft: msg.sender === user.username ? 0 : '4px',
                    paddingRight: msg.sender === user.username ? '4px' : 0
                  }}>
                    {msg.sender}
                  </div>
                )}
                
                {editingMessageId === msg.id ? (
                  <div style={{
                    width: '100%',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: '15px',
                        border: `2px solid ${userColor}`,
                        borderRadius: '12px',
                        outline: 'none'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditMessage(msg.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <button
                      onClick={() => handleEditMessage(msg.id)}
                      style={{
                        padding: '8px',
                        background: userColor,
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Check size={16} color="white" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      style={{
                        padding: '8px',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={16} color="white" />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Render controls on the left for messages owned by the current user */}
                      {msg.sender === user.username && !msg.isSystem && (
                        <div style={{ display: 'flex', gap: '4px', opacity: 0.85 }}>
                          <button
                            onClick={() => handleReply(msg)}
                            title="Reply"
                            style={{
                              padding: '6px',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <CornerDownLeft size={14} color="#6b7280" />
                          </button>

                          <button
                            onClick={() => startEditing(msg)}
                            style={{
                              padding: '6px',
                              background: `${userColor}20`,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = `${userColor}40`}
                            onMouseLeave={(e) => e.currentTarget.style.background = `${userColor}20`}
                          >
                            <Edit2 size={14} color={userColor} />
                          </button>

                          <button
                            onClick={() => openDeleteModal(msg.id)}
                            style={{
                              padding: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      )}

                      <div style={{
                        padding: msg.isSystem ? '12px 16px' : '14px 18px',
                        borderRadius: msg.isSystem ? '10px' : (msg.sender === user.username ? '18px 18px 4px 18px' : '18px 18px 18px 4px'),
                        background: msg.isSystem ? 'rgba(15, 118, 110, 0.1)' : 'white',
                        color: msg.isSystem ? '#0f766e' : '#1e293b',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        boxShadow: msg.isSystem ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                        fontStyle: msg.isSystem ? 'italic' : 'normal',
                        border: msg.isSystem ? 'none' : `3px solid ${userColor}`,
                        position: 'relative',
                        // Ensure very long words wrap instead of extending horizontally
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        // Limit bubble width to ~30 characters so long text wraps to the next line
                        maxWidth: '30ch'
                      }}>
                        {/* If this message is a reply to another, show the quoted preview */}
                        {(msg as any).replyTo && ((msg as any).replyTo.text || (msg as any).replyTo.sender) && (
                          <div style={{
                            marginBottom: '8px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid rgba(0,0,0,0.1)'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginBottom: '3px'
                            }}>
                              <Reply size={11} color="#64748b" style={{ transform: 'scaleX(-1)' }} />
                              <span style={{
                                fontSize: '11px',
                                color: '#64748b',
                                fontStyle: 'normal'
                              }}>
                                You replied to {(msg as any).replyTo.sender === user.username ? 'yourself' : (msg as any).replyTo.sender}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: '#64748b',
                              // limit quoted preview width and allow wrapping
                              maxWidth: '30ch',
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                              paddingLeft: '2px',
                              opacity: 0.8
                            }}>
                              {(msg as any).replyTo.text}
                            </div>
                          </div>
                        )}

                        {msg.text}
                        {msg.isEdited && (
                          <span style={{
                            fontSize: '11px',
                            marginLeft: '6px',
                            opacity: 0.7,
                            fontStyle: 'italic',
                            color: '#64748b'
                          }}>
                            (edited)
                          </span>
                        )}
                      </div>

                    {msg.sender !== user.username && !msg.isSystem && (
                      <div style={{ display: 'flex', gap: '4px', opacity: 0.85 }}>
                        <button
                          onClick={() => handleReply(msg)}
                          title="Reply"
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <CornerDownLeft size={14} color="#6b7280" />
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                )}

                <div style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  marginTop: '6px',
                  paddingLeft: msg.sender === user.username ? 0 : '4px',
                  paddingRight: msg.sender === user.username ? '4px' : 0
                }}>
                  {formatTimestamp(msg.timestamp)}
                </div>

                {renderReadReceipts(msg)}
              </div>

              {msg.sender === user.username && !msg.isSystem && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: userColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '14px',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}>
                  {userInitials}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Jump to Latest Button */}
      {showNewMessagesBadge && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}>
          <button
            onClick={handleJumpToLatest}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
          >
            {unreadCount > 0 && (
              <span style={{
                background: 'white',
                color: '#3b82f6',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {unreadCount}
              </span>
            )}
            <span>Jump to latest</span>
            <span style={{ fontSize: '18px' }}>↓</span>
          </button>
        </div>
      )}

      <div style={{
        padding: '20px 30px',
        borderTop: '1px solid #e2e8f0',
        background: 'white'
      }}>
        {replyTo && (
          <div style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '2px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px'
              }}>
                <Reply size={14} color="#3b82f6" />
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b'
                }}>
                  Replying to
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: getUserColor(replyTo.sender)
                }}>
                  {replyTo.sender === user.username ? 'yourself' : replyTo.sender}
                </span>
              </div>
              <div style={{
                fontSize: '13px',
                color: '#475569',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingLeft: '20px'
              }}>
                {replyTo.text}
              </div>
            </div>
            <button 
              onClick={cancelReply} 
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Cancel reply"
            >
              <X size={16} color="#64748b" />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '14px 20px',
              fontSize: '15px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '15px'
            }}
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>

// Replace your Members Modal section (around line 850+) with this:

{/* Members Modal */}
{membersModalOpen && (
  <div 
    style={{ 
      position: 'fixed', 
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', 
      backdropFilter: 'blur(4px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000 
    }} 
    onClick={() => setMembersModalOpen(false)}
  >
    <div 
      style={{ 
        background: 'white',
        borderRadius: '20px',
        padding: '0',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.3s ease-out',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }} 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        padding: '25px 30px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 6px 0'
        }}>
          Room Members
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          margin: 0
        }}>
          Manage who can access this room
        </p>
      </div>

      {/* Members List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 30px'
      }}>
        {membersLoading && (
          <div style={{ 
            textAlign: 'center',
            padding: '40px 20px',
            color: '#94a3b8'
          }}>
            Loading members...
          </div>
        )}
        
        {membersError && (
          <div style={{ 
            padding: '12px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px'
          }}>
            {membersError}
          </div>
        )}
        
        {!membersLoading && !membersError && membersList.length === 0 && rawMembers.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#94a3b8'
          }}>
            No members found
          </div>
        )}

        {!membersLoading && !membersError && membersList.length === 0 && rawMembers.length > 0 && (
          <div>
            {rawMembers.map((r, idx) => {
              const memberName = String(r);
              const isAdmin = currentRoom && (currentRoom.admin === memberName);
              const userColor = getUserColor(memberName);
              const userInitials = getUserInitials(memberName);

              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '14px',
                    marginBottom: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: userColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '700',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    {userInitials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {memberName}
                      {isAdmin ? (
                        <span style={{
                          background: '#dcfce7',
                          color: '#065f46',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          Admin
                        </span>
                      ) : (
                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          Member
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }} title="online" aria-label="online">
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#10b981',
                        animation: 'pulse 2s infinite'
                      }}></span>
                    </div>
                  </div>

                  {currentRoom && currentRoom.admin === user.username && memberName !== currentRoom.admin && (
                    <button 
                      onClick={async () => {
                        try {
                          const identifier = encodeURIComponent(memberName);
                          const res = await fetch(`http://localhost:5000/api/rooms/${currentRoom.id}/members/${identifier}/kick`, { method: 'POST' });
                          if (res.ok) {
                            await fetchMembers();
                          } else {
                            setMembersError('Failed to remove member');
                          }
                        } catch (err) {
                          setMembersError('Failed to remove member');
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!membersLoading && !membersError && membersList.map(m => {
          const memberName = m.name || m.email || m.id || 'Unknown';
          const isAdmin = currentRoom && ((currentRoom.admin === m.name) || (currentRoom.admin === m.email) || String(currentRoom.admin) === String(m.id));
          const userColor = getUserColor(String(memberName));
          const userInitials = getUserInitials(String(memberName));

          return (
            <div 
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '14px',
                marginBottom: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: userColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: '700',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                {userInitials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {memberName}
                  {isAdmin ? (
                    <span style={{
                      background: '#dcfce7',
                      color: '#065f46',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      Admin
                    </span>
                  ) : (
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      Member
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }} title="online" aria-label="online">
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10b981',
                    animation: 'pulse 2s infinite'
                  }}></span>
                </div>
              </div>

              {currentRoom && currentRoom.admin === user.username && String(memberName) !== String(currentRoom.admin) && (
                <button 
                  onClick={async () => {
                    try {
                      const rawId = m.email ?? m.name ?? m.id ?? '';
                      const identifier = encodeURIComponent(String(rawId));
                      const res = await fetch(`http://localhost:5000/api/rooms/${currentRoom.id}/members/${identifier}/kick`, { method: 'POST' });
                      if (res.ok) {
                        await fetchMembers();
                      } else {
                        setMembersError('Failed to remove member');
                      }
                    } catch (err) {
                      setMembersError('Failed to remove member');
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 30px',
        borderTop: '1px solid #e2e8f0'
      }}>
        <button 
          onClick={() => setMembersModalOpen(false)}
          style={{
            width: '100%',
            padding: '14px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Close
        </button>
      </div>
    </div>

    <style>{`
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `}</style>
  </div>
)}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1300 }} onClick={() => { setDeleteModalOpen(false); setDeleteCandidateId(null); }}>
            <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '92%', maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '36px 28px 24px', boxShadow: '0 10px 30px rgba(2,6,23,0.2)' }}>
                {/* red circular icon */}
                <div style={{ position: 'absolute', left: '50%', top: '-36px', transform: 'translateX(-50%)', width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(180deg,#ff5a5f,#ff2d2d)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(255,45,45,0.25)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 6L18.2 19.2C18.1 20.4 17.2 21 16 21H8C6.8 21 5.9 20.4 5.8 19.2L5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11V17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11V17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <h3 style={{ margin: 0, textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Delete Message?</h3>
                <p style={{ textAlign: 'center', color: '#667085', marginTop: 12, marginBottom: 20 }}>Are you sure you want to delete this message? This action cannot be undone.</p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                  <button
                    onClick={() => { setDeleteModalOpen(false); setDeleteCandidateId(null); }}
                    style={{ padding: '12px 28px', background: '#f1f5f9', border: 'none', borderRadius: 12, color: '#0f172a', fontWeight: 600, transition: 'all 180ms ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e6eef7'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmDeleteMessage}
                    style={{ padding: '12px 28px', background: 'linear-gradient(180deg,#ff5a5f,#ff2d2d)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, boxShadow: '0 8px 24px rgba(255,45,45,0.28)', transition: 'transform 160ms ease, box-shadow 160ms ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px) scale(1.02)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 34px rgba(255,45,45,0.34)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(255,45,45,0.28)'; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatArea;