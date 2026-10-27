import { Composition } from "remotion";
import { Renovacion, DURACION, FPS } from "./Renovacion";

export const RemotionRoot = () => (
  <Composition id="Renovacion" component={Renovacion} durationInFrames={DURACION} fps={FPS} width={1080} height={1920} />
);
