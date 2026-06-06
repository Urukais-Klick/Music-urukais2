import { useEffect, useRef } from 'react';

export default function GlowingAudioVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bars = container.querySelectorAll<HTMLDivElement>('.bar');
    const numBars = bars.length;
    let prevIndices: number[] = [];
    let animId: number;

    function animate() {
      prevIndices.forEach((index) => {
        if (bars[index]) bars[index].style.height = '10%';
      });
      prevIndices = [];

      for (let i = 0; i < Math.floor(numBars / 6); i++) {
        const randomIndex = Math.floor(Math.random() * numBars);
        const height = Math.floor(Math.random() * 70) + 30;
        if (bars[randomIndex]) bars[randomIndex].style.height = height + '%';
        prevIndices.push(randomIndex);
      }

      animId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const bars = Array.from({ length: 40 }, (_, i) => (
    <div
      key={i}
      className="bar"
      style={{
        width: '2px',
        height: '10%',
        background: 'linear-gradient(to top, #ff00ff, #00f0ff)',
        boxShadow: '0 0 8px #00f0ff',
        transition: 'height 0.1s ease',
        borderRadius: '1px',
      }}
    />
  ));

  return (
    <div
      ref={containerRef}
      className="flex items-end justify-center gap-[3px] h-12 overflow-hidden"
    >
      {bars}
    </div>
  );
}
