import NeonBroadcastGrid from '@/components/NeonBroadcastGrid';
import CustomCursor from '@/components/CustomCursor';
import Hero from '@/sections/Hero';
import Lineup from '@/sections/Lineup';
import LiveFeed from '@/sections/LiveFeed';
import Footer from '@/sections/Footer';

function App() {
  return (
    <div className="relative min-h-screen bg-base-black">
      <NeonBroadcastGrid />
      <CustomCursor />
      <main>
        <Hero />
        <Lineup />
        <LiveFeed />
        <Footer />
      </main>
    </div>
  );
}

export default App;
