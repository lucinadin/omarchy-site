fn bayer2(position: vec2u) -> u32 {
  return select(select(0u, 2u, position.x == 1u), select(3u, 1u, position.x == 1u), position.y == 1u);
}

export fn page_effect_bayer(position: vec2u, matrix_size: f32, scale: f32) -> f32 {
  let scaled_position = vec2u(floor(vec2f(position) / max(1.0, scale)));
  let first = bayer2(scaled_position & vec2u(1u));
  if (matrix_size < 3.0) {
    return (f32(first) + 0.5) / 4.0 - 0.5;
  }

  let second = bayer2((scaled_position >> vec2u(1u)) & vec2u(1u));
  if (matrix_size < 6.0) {
    return (f32(first * 4u + second) + 0.5) / 16.0 - 0.5;
  }

  let third = bayer2((scaled_position >> vec2u(2u)) & vec2u(1u));
  return (f32(first * 16u + second * 4u + third) + 0.5) / 64.0 - 0.5;
}

export fn page_effect_quantize(color: vec3f, levels: f32, threshold: f32) -> vec3f {
  let maximum = max(1.0, levels - 1.0);
  return clamp(floor(color * maximum + 0.5 + threshold) / maximum, vec3f(0.0), vec3f(1.0));
}

export fn page_effect_halftone(
  color: vec3f,
  position: vec2f,
  scale: f32,
  angle_degrees: f32,
  dot_size: f32,
) -> vec3f {
  let angle = angle_degrees * 0.01745329252;
  let rotated = vec2f(
    position.x * cos(angle) - position.y * sin(angle),
    position.x * sin(angle) + position.y * cos(angle),
  );
  let cell = fract(rotated / max(1.0, scale)) - vec2f(0.5);
  let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let radius = sqrt(clamp(1.0 - luminance, 0.0, 1.0)) * 0.5 * dot_size;
  let antialias = min(0.16, 0.75 / max(1.0, scale));
  let paper_mask = smoothstep(radius - antialias, radius + antialias, length(cell));
  let ink = color * 0.08;
  let paper = mix(vec3f(1.0), color, 0.2);
  return mix(ink, paper, paper_mask);
}
