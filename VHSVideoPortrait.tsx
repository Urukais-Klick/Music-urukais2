interface VHSVideoPortraitProps {
  src: string;
  className?: string;
}

export default function VHSVideoPortrait({ src, className = '' }: VHSVideoPortraitProps) {
  return (
    <div className={`vhs-container ${className}`}>
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
      />
    </div>
  );
}
