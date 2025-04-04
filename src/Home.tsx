import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SocketService from './services/SocketService';

const Home = () => {
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const generateRoomId = () => {
        // Generate a random 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setRoomId(result);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!roomId.trim()) {
            setError('Room ID is required');
            return;
        }

        if (!username.trim()) {
            setError('Username is required');
            return;
        }

        // Initialize socket connection
        try {
            SocketService.connect();
            // Navigate to the video room
            navigate(`/room/${roomId}`, { state: { username } });
        } catch (err) {
            console.error('Error connecting to server:', err);
            setError('Failed to connect to server. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Join Video Chat</h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label
                            htmlFor="roomId"
                            className="block text-gray-700 text-sm font-bold mb-2"
                        >
                            Room ID
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                id="roomId"
                                className="shadow appearance-none border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter room ID"
                                required
                            />
                            <button
                                type="button"
                                onClick={generateRoomId}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                            >
                                Generate
                            </button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label
                            htmlFor="username"
                            className="block text-gray-700 text-sm font-bold mb-2"
                        >
                            Your Name
                        </label>
                        <input
                            type="text"
                            id="username"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-center">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Join Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Home;
