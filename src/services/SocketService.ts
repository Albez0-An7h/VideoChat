import { io, Socket } from 'socket.io-client';

export interface User {
    id: string;
    username: string;
}

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(serverUrl: string = 'http://localhost:3001'): void {
        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from signaling server');
        });
    }

    public joinRoom(roomId: string, username: string): void {
        if (this.socket) {
            this.socket.emit('join_room', roomId, username);
        }
    }

    public sendOffer(offer: RTCSessionDescriptionInit, toUserId: string): void {
        if (this.socket) {
            this.socket.emit('offer', offer, toUserId);
        }
    }

    public sendAnswer(answer: RTCSessionDescriptionInit, toUserId: string): void {
        if (this.socket) {
            this.socket.emit('answer', answer, toUserId);
        }
    }

    public sendIceCandidate(candidate: RTCIceCandidate, toUserId: string): void {
        if (this.socket) {
            this.socket.emit('ice_candidate', candidate, toUserId);
        }
    }

    public onRoomUsers(callback: (users: User[]) => void): void {
        if (this.socket) {
            this.socket.on('room_users', callback);
        }
    }

    public onUserJoined(callback: (user: User) => void): void {
        if (this.socket) {
            this.socket.on('user_joined', callback);
        }
    }

    public onUserLeft(callback: (userId: string) => void): void {
        if (this.socket) {
            this.socket.on('user_left', callback);
        }
    }

    public onOffer(callback: (offer: RTCSessionDescriptionInit, fromUserId: string) => void): void {
        if (this.socket) {
            this.socket.on('offer', callback);
        }
    }

    public onAnswer(callback: (answer: RTCSessionDescriptionInit, fromUserId: string) => void): void {
        if (this.socket) {
            this.socket.on('answer', callback);
        }
    }

    public onIceCandidate(callback: (candidate: RTCIceCandidate, fromUserId: string) => void): void {
        if (this.socket) {
            this.socket.on('ice_candidate', callback);
        }
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    public getSocketId(): string | null {
        return this.socket?.id || null;
    }
}

export default SocketService.getInstance();
