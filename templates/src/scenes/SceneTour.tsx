import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { THEME } from "../theme";

interface SceneTourProps {
  recordingFile: string;   // e.g. "recordings/traces.mp4"
  startFromSec: number;    // from TimelineRecorder output
  calloutX?: number;       // Wow Moment: pixel X from WebBridge evaluate
  calloutY?: number;       // Wow Moment: pixel Y from WebBridge evaluate
}

export const SceneTour: React.FC<SceneTourProps> = ({ recordingFile, startFromSec, calloutX, calloutY }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken Burns — prevents static screenshot feel
  const scale = 1 + frame * 0.0002;

  // Callout circle (if Wow Moment coords provided)
  const ring = calloutX ? spring({ frame: frame - 20, fps, config: THEME.spring }) : 0;

  return (
    <AbsoluteFill style={{ background: THEME.bg, overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(recordingFile)}
        startFrom={Math.ceil(startFromSec * fps)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
      />

      {calloutX && calloutY && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {/* Outer pulsing ring */}
          <div style={{
            position: "absolute",
            left: calloutX - 30, top: calloutY - 30,
            width: 60, height: 60,
            borderRadius: "50%",
            border: `2px solid ${THEME.accent}`,
            opacity: interpolate(ring, [0, 1], [0.8, 0]),
            transform: `scale(${interpolate(ring, [0, 1], [1, 2.5])})`,
          }} />
          {/* Inner dot */}
          <div style={{
            position: "absolute",
            left: calloutX - 8, top: calloutY - 8,
            width: 16, height: 16,
            borderRadius: "50%",
            background: THEME.accent,
            transform: `scale(${ring})`,
          }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
