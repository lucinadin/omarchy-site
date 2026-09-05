import { logoIdleGradientAngle, type LogoEffectIdle } from "@/lib/effects/logo/idle";
import { mixColor } from "@/lib/effects/logo/runtime/color";
import { positiveModulo } from "@/lib/effects/logo/runtime/math";
import type { GlyphParticle, LogoGlyphChannel } from "@/lib/effects/logo/types";
import { unreachable } from "@/lib/validation";

export type LogoIdleEmission = {
  channel: LogoGlyphChannel;
  particle: GlyphParticle;
};

function hashCell(column: number, row: number) {
  const value = Math.sin(column * 12.9898 + row * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function animateMotion(particle: GlyphParticle, idle: LogoEffectIdle, elapsedMs: number) {
  const time = (elapsedMs / 1000) * idle.speed;
  const phase = time * Math.PI * 2;
  const spatial = particle.column * 0.14 + particle.row * 0.31;
  const intensity = idle.intensity;

  switch (idle.motion) {
    case "pulse": {
      const wave = Math.sin(phase * 0.35 + spatial) * intensity;
      return {
        ...particle,
        glow: (particle.glow ?? 0) + Math.max(0, wave) * 0.45,
        scale: (particle.scale ?? 1) * (1 + wave * 0.025),
      };
    }
    case "drift":
      return {
        ...particle,
        offsetX: (particle.offsetX ?? 0) + Math.sin(phase * 0.18 + spatial) * intensity * 0.08,
        offsetY:
          (particle.offsetY ?? 0) + Math.cos(phase * 0.14 + spatial * 0.7) * intensity * 0.06,
      };
    case "scan": {
      const distance = Math.abs(positiveModulo(particle.column - time * 12, 88) - 44);
      const band = Math.max(0, 1 - distance / 6) * intensity;
      return {
        ...particle,
        glow: (particle.glow ?? 0) + band * 0.8,
        scale: (particle.scale ?? 1) * (1 + band * 0.035),
      };
    }
    case "sparkle": {
      const sparkle = Math.max(
        0,
        Math.sin(phase * 0.42 + hashCell(particle.column, particle.row) * Math.PI * 8) - 0.82
      );
      return {
        ...particle,
        glow: (particle.glow ?? 0) + sparkle * intensity * 2.4,
        scale: (particle.scale ?? 1) * (1 + sparkle * intensity * 0.12),
      };
    }
    case "jitter": {
      const beat = Math.floor(time * 5);
      const active = hashCell(particle.column + beat * 7, particle.row + beat * 3) > 0.94;
      if (!active) return particle;
      const direction = hashCell(particle.row + beat, particle.column - beat) > 0.5 ? 1 : -1;
      return {
        ...particle,
        offsetX: (particle.offsetX ?? 0) + direction * intensity * 0.16,
      };
    }
    default:
      return unreachable(idle.motion);
  }
}

function projection(particle: GlyphParticle, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return particle.column * Math.cos(radians) + particle.row * Math.sin(radians);
}

export function applyLogoIdleFrame(
  emissions: readonly LogoIdleEmission[],
  idle: LogoEffectIdle,
  elapsedMs: number
): LogoIdleEmission[] {
  if (!idle.enabled || elapsedMs <= 0) return [...emissions];

  const animated = emissions.map((emission) =>
    emission.channel === "finalText"
      ? { ...emission, particle: animateMotion(emission.particle, idle, elapsedMs) }
      : emission
  );
  if (!idle.animateGradient) return animated;

  const angle = logoIdleGradientAngle(idle);
  const finalIndices: number[] = [];
  for (let index = 0; index < emissions.length; index += 1) {
    if (emissions[index].channel === "finalText") finalIndices.push(index);
  }
  if (finalIndices.length < 2) return animated;

  finalIndices.sort(
    (left, right) =>
      projection(emissions[left].particle, angle) - projection(emissions[right].particle, angle)
  );
  const travel = (elapsedMs / 1000) * idle.gradientSpeed * finalIndices.length;
  for (let position = 0; position < finalIndices.length; position += 1) {
    const sample = positiveModulo(position - travel, finalIndices.length);
    const lower = Math.floor(sample);
    const upper = (lower + 1) % finalIndices.length;
    const color = mixColor(
      emissions[finalIndices[lower]].particle.color,
      emissions[finalIndices[upper]].particle.color,
      sample - lower
    );
    const emissionIndex = finalIndices[position];
    animated[emissionIndex] = {
      ...animated[emissionIndex],
      particle: { ...animated[emissionIndex].particle, color },
    };
  }
  return animated;
}
