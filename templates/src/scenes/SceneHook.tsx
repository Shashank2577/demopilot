import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedText, GradientTransition } from "remotion-bits";
import { THEME } from "../theme";

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: THEME.bg, fontFamily: THEME.font.heading, overflow: "hidden" }}>
      <GradientTransition from={THEME.bg} to={THEME.surface} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
        <AnimatedText
          text="Your pain statement here — specific, not vague."
          split="word"
          staggerMs={THEME.stagger}
          animation="fadeUp"
          spring={THEME.spring}
          style={{
            color: THEME.text.primary,
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.2,
            textAlign: "center",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
