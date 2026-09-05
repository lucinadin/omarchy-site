fn foil_hash(position: vec2f) -> f32 {
  return fract(sin(dot(position, vec2f(12.9898, 78.233))) * 43758.5453);
}

fn foil_noise(position: vec2f) -> f32 {
  let cell = floor(position);
  let fraction = fract(position);
  let blend = fraction * fraction * (3.0 - 2.0 * fraction);
  let lower = mix(foil_hash(cell), foil_hash(cell + vec2f(1.0, 0.0)), blend.x);
  let upper = mix(
    foil_hash(cell + vec2f(0.0, 1.0)),
    foil_hash(cell + vec2f(1.0, 1.0)),
    blend.x,
  );
  return mix(lower, upper, blend.y);
}

fn foil_fbm(position: vec2f) -> f32 {
  let first = foil_noise(position) * 0.57;
  let second = foil_noise(position * 2.03 + vec2f(17.1, 9.2)) * 0.29;
  let third = foil_noise(position * 4.11 + vec2f(3.7, 25.8)) * 0.14;
  return first + second + third;
}

export fn foil_texture_noise(
  uv: vec2f,
  seed: f32,
  texture_amount: f32,
) -> f32 {
  let position = uv * vec2f(13.0, 17.0)
    + seed * vec2f(19.7, 7.3);
  let coarse = foil_fbm(position);
  let interference = 0.5 + 0.5 * sin((
    uv.x * 19.0
      - uv.y * 14.0
      + coarse * (1.6 + clamp(texture_amount, 0.0, 2.0) * 1.6)
      + seed * 7.0
  ) * 6.2831853);
  return clamp(coarse * 0.78 + interference * 0.22, 0.0, 1.0);
}

export fn foil_breakup(noise: f32, texture_amount: f32) -> f32 {
  let amount = clamp(texture_amount, 0.0, 2.0);
  return clamp(1.0 + (noise * 2.0 - 1.0) * 0.42 * amount, 0.25, 1.55);
}

export fn foil_spectrum(
  uv: vec2f,
  reflection_direction: vec3f,
  groove_angle: f32,
  rainbow_density: f32,
  seed: f32,
  noise: f32,
) -> vec3f {
  let groove_direction = vec2f(cos(groove_angle), sin(groove_angle));
  let groove_position = dot(uv, groove_direction) * max(rainbow_density, 0.5);
  let angular_shift = dot(reflection_direction.xy, groove_direction) * 2.8;
  let angle = (groove_position + angular_shift + noise * 0.42 + seed) * 6.2831853;
  return 0.5 + 0.5 * cos(vec3f(angle, angle + 2.0943951, angle + 4.1887902));
}

export fn foil_sparkle(
  uv: vec2f,
  half_facing: f32,
  seed: f32,
  density: f32,
) -> f32 {
  let safe_density = max(density, 4.0);
  let cell_position = uv * safe_density;
  let cell = floor(cell_position);
  let offset = fract(cell_position) - vec2f(0.5);
  let sparkle_seed = foil_hash(cell + seed * vec2f(113.0, 71.0));
  let point = smoothstep(0.16, 0.0, length(offset));
  let selected = smoothstep(0.965, 1.0, sparkle_seed);
  let angular_response = pow(clamp(half_facing, 0.0, 1.0), 48.0);
  return point * selected * angular_response;
}
