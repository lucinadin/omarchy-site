export fn page_effect_hash(position: vec2f, frame: f32) -> f32 {
  let seed = dot(position + vec2f(frame * 19.19, frame * 7.73), vec2f(12.9898, 78.233));
  return fract(sin(seed) * 43758.5453);
}

export fn page_effect_grain(position: vec2f, frame: f32) -> f32 {
  let coarse = page_effect_hash(floor(position * 0.5), frame);
  let fine = page_effect_hash(position, frame + 11.0);
  return mix(coarse, fine, 0.64) * 2.0 - 1.0;
}
