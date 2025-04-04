import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import VideoGrid from './components/VideoGrid';
import WebRTCService from './services/WebRTCService';
import { 
    MicOnIcon, MicOffIcon, CameraOnIcon, CameraOffIcon, 
    EndCallIcon, ShareIcon 
} from './components/Icons';

interface LocationState {
    username: string;
}

const VideoRoom = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { username } = (location.state as LocationState) || {};

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [activePeers, setActivePeers] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());

    // Make sure we have required information
    useEffect(() => {
        if (!roomId || !username) {
            navigate('/', { replace: true });
        }
    }, [roomId, username, navigate]);

    // Setup WebRTC when component mounts
    useEffect(() => {
        if (!roomId || !username) return;

        const setupWebRTC = async () => {
            try {
                // Initialize WebRTC and get local stream
                const stream = await WebRTCService.initialize(roomId, username);
                setLocalStream(stream);

                // Handle remote streams
                WebRTCService.onRemoteStream((userId, stream) => {
                    setRemoteStreams(prev => {
                        const newStreams = new Map(prev);
                        newStreams.set(userId, stream);
                        return newStreams;
                    });
                });

                // Handle remote stream removal
                WebRTCService.onRemoteStreamRemoved((userId) => {
                    setRemoteStreams(prev => {
                        const newStreams = new Map(prev);
                        newStreams.delete(userId);
                        return newStreams;
                    });
                });

                // Monitor connection states
                WebRTCService.onConnectionStateChange((userId, state) => {
                    setConnectionStates((prev: Map<string, RTCPeerConnectionState>) => {
                        const newStates = new Map(prev);
                        newStates.set(userId, state);
                        return newStates;
                    });
                    
                    // Update active peer count
                    const connectedPeers = WebRTCService.getConnectionsCount();
                    setActivePeers(connectedPeers);
                });

                setIsLoading(false);
            } catch (err) {
                console.error("Error setting up WebRTC:", err);
                setError("Failed to access camera and microphone. Please make sure they are connected and permissions are granted.");
                setIsLoading(false);
            }
        };

        setupWebRTC();

        // Cleanup when component unmounts
        return () => {
            WebRTCService.cleanup();
        };
    }, [roomId, username]);

    const toggleCamera = () => {
        const newState = !isCameraOn;
        WebRTCService.toggleCamera(newState);
        setIsCameraOn(newState);
    };

    const toggleMicrophone = () => {
        const newState = !isMicOn;
        WebRTCService.toggleMicrophone(newState);
        setIsMicOn(newState);
    };

    // Share room link functionality
    const shareRoom = () => {
        const shareUrl = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'Join my video chat',
                text: `Join my video chat room with code: ${roomId}`,
                url: shareUrl
            }).catch(err => console.log('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(shareUrl)
                .then(() => alert('Room link copied to clipboard!'))
                .catch(err => console.log('Error copying link:', err));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-xl">Connecting to camera and room...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="text-xl text-red-600 mb-4">{error}</p>
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => navigate('/')}
                >
                    Return to Home
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 h-screen">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Video Chat: Room {roomId}</h1>
                    <p className="text-sm text-gray-600">
                        {activePeers} participant{activePeers !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                    onClick={shareRoom}
                >
                    <ShareIcon />
                    <span>Share Room</span>
                </button>
            </div>
            
            <div className="h-[calc(100vh-180px)]">
                <VideoGrid
                    streams={Array.from(remoteStreams.values())}
                    localStream={localStream || undefined}
                />
            </div>
            
            <div className="fixed bottom-4 left-0 right-0 flex justify-center space-x-4 p-4 bg-gray-100 rounded-t-lg">
                <button
                    className={`p-3 rounded-full ${isMicOn ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}
                    onClick={toggleMicrophone}
                >
                    {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
                </button>
                
                <button
                    className={`p-3 rounded-full ${isCameraOn ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}
                    onClick={toggleCamera}
                >
                    {isCameraOn ? <CameraOnIcon /> : <CameraOffIcon />}
                </button>
                
                <button
                    className="p-3 rounded-full bg-red-500 text-white"
                    onClick={() => navigate('/')}
                >
                    <EndCallIcon />
                </button>
            </div>
        </div>
    );
};

export default VideoRoom;