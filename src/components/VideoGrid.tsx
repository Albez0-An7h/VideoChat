import { useEffect, useRef } from 'react';

interface VideoGridProps {
    streams: MediaStream[];
    localStream?: MediaStream;
}

const VideoGrid = ({ streams, localStream }: VideoGridProps) => {
    // Calculate grid layout based on number of videos
    const gridClassName = () => {
        const count = streams.length + (localStream ? 1 : 0);

        if (count <= 1) return "grid-cols-1";
        if (count <= 2) return "grid-cols-2";
        if (count <= 4) return "grid-cols-2";
        if (count <= 9) return "grid-cols-3";
        return "grid-cols-4";
    };

    return (
        <div className={`grid gap-2 ${gridClassName()} w-full h-full`}>
            {/* Local video (if available) */}
            {localStream && <VideoTile stream={localStream} isMuted={true} isLocal={true} />}

            {/* Remote videos */}
            {streams.map((stream, index) => (
                <VideoTile
                    key={stream.id || index}
                    stream={stream}
                    isMuted={false}
                    isLocal={false}
                />
            ))}
        </div>
    );
};

// Individual video tile component
interface VideoTileProps {
    stream: MediaStream;
    isMuted: boolean;
    isLocal: boolean;
}

const VideoTile = ({ stream, isMuted, isLocal }: VideoTileProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }

        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [stream]);

    return (
        <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className={`w-full h-full object-cover ${isLocal ? 'mirror' : ''}`}
            />
            {isLocal && (
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                    You
                </div>
            )}
        </div>
    );
};

export default VideoGrid;