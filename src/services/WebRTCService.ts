import SocketService, { User } from './SocketService';

interface PeerConnection {
    user: User;
    connection: RTCPeerConnection;
    connectionState?: RTCPeerConnectionState;
}

class WebRTCService {
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, PeerConnection> = new Map();
    private onRemoteStreamCallback: ((userId: string, stream: MediaStream) => void) | null = null;
    private onRemoteStreamRemovedCallback: ((userId: string) => void) | null = null;
    private onConnectionStateChangeCallback: ((userId: string, state: RTCPeerConnectionState) => void) | null = null;

    private static instance: WebRTCService;

    private constructor() { }

    public static getInstance(): WebRTCService {
        if (!WebRTCService.instance) {
            WebRTCService.instance = new WebRTCService();
        }
        return WebRTCService.instance;
    }

    public async initialize(roomId: string, username: string): Promise<MediaStream> {
        await this.setupLocalStream();
        this.setupSocketListeners();
        SocketService.joinRoom(roomId, username);
        return this.localStream!;
    }

    private async setupLocalStream(): Promise<void> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    // Toggle camera on/off
    public toggleCamera(enabled: boolean): void {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    // Toggle microphone on/off
    public toggleMicrophone(enabled: boolean): void {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    // Check if video is currently enabled
    public isVideoEnabled(): boolean {
        if (!this.localStream) return false;
        const videoTracks = this.localStream.getVideoTracks();
        return videoTracks.length > 0 && videoTracks[0].enabled;
    }

    // Check if audio is currently enabled
    public isAudioEnabled(): boolean {
        if (!this.localStream) return false;
        const audioTracks = this.localStream.getAudioTracks();
        return audioTracks.length > 0 && audioTracks[0].enabled;
    }

    private setupSocketListeners(): void {
        SocketService.onRoomUsers((users) => {
            // Create peer connections for existing users
            users.forEach(user => {
                // Don't create a connection to ourselves
                if (user.id !== SocketService.getSocketId()) {
                    this.createPeerConnection(user);
                }
            });
        });

        SocketService.onUserJoined((user) => {
            this.createPeerConnection(user);
        });

        SocketService.onUserLeft((userId) => {
            this.removePeerConnection(userId);
        });

        SocketService.onOffer(async (offer, fromUserId) => {
            const peerConnection = this.peerConnections.get(fromUserId);
            if (peerConnection) {
                try {
                    await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await peerConnection.connection.createAnswer();
                    await peerConnection.connection.setLocalDescription(answer);
                    SocketService.sendAnswer(answer, fromUserId);
                } catch (error) {
                    console.error('Error handling offer:', error);
                }
            }
        });

        SocketService.onAnswer(async (answer, fromUserId) => {
            const peerConnection = this.peerConnections.get(fromUserId);
            if (peerConnection) {
                try {
                    await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (error) {
                    console.error('Error handling answer:', error);
                }
            }
        });

        SocketService.onIceCandidate((candidate, fromUserId) => {
            const peerConnection = this.peerConnections.get(fromUserId);
            if (peerConnection) {
                try {
                    peerConnection.connection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    console.error('Error adding ice candidate:', error);
                }
            }
        });
    }

    private async createPeerConnection(user: User): Promise<void> {
        if (this.peerConnections.has(user.id)) {
            return;
        }

        // Enhanced ICE server configuration for better NAT traversal
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // You may want to add TURN servers for production
                // { 
                //   urls: 'turn:your-turn-server.com:3478',
                //   username: 'username',
                //   credential: 'password'
                // }
            ],
            iceCandidatePoolSize: 10
        };

        const peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to the connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream!);
            });
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                SocketService.sendIceCandidate(event.candidate, user.id);
            }
        };

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            if (this.onRemoteStreamCallback && event.streams && event.streams[0]) {
                this.onRemoteStreamCallback(user.id, event.streams[0]);
            }
        };

        // Monitor connection state changes
        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback(user.id, state);
            }
            
            // Implement reconnection logic for failed connections
            if (state === 'failed') {
                console.log(`Connection to ${user.id} failed. Attempting to reconnect...`);
                this.removePeerConnection(user.id);
                setTimeout(() => {
                    this.createPeerConnection(user);
                }, 2000);
            }
        };

        // Store the connection
        this.peerConnections.set(user.id, { 
            user, 
            connection: peerConnection,
            connectionState: peerConnection.connectionState 
        });

        // If we're the initiator (the one who joined later), create an offer
        if (SocketService.getSocketId()! > user.id) {
            try {
                const offer = await peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                await peerConnection.setLocalDescription(offer);
                SocketService.sendOffer(offer, user.id);
            } catch (error) {
                console.error('Error creating offer:', error);
            }
        }
    }

    private removePeerConnection(userId: string): void {
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.connection.close();
            this.peerConnections.delete(userId);

            if (this.onRemoteStreamRemovedCallback) {
                this.onRemoteStreamRemovedCallback(userId);
            }
        }
    }

    public onRemoteStream(callback: (userId: string, stream: MediaStream) => void): void {
        this.onRemoteStreamCallback = callback;
    }

    public onRemoteStreamRemoved(callback: (userId: string) => void): void {
        this.onRemoteStreamRemovedCallback = callback;
    }

    public onConnectionStateChange(callback: (userId: string, state: RTCPeerConnectionState) => void): void {
        this.onConnectionStateChangeCallback = callback;
    }

    public getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    public getConnectionsCount(): number {
        return this.peerConnections.size;
    }

    public cleanup(): void {
        // Close all peer connections
        this.peerConnections.forEach((peer) => {
            peer.connection.close();
        });
        this.peerConnections.clear();

        // Stop all tracks in the local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
            });
        }
        this.localStream = null;

        // Disconnect the socket
        SocketService.disconnect();
    }
}

export default WebRTCService.getInstance();
