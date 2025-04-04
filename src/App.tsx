import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import VideoRoom from './VideoRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<VideoRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
