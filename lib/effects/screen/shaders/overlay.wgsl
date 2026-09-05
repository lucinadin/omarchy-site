struct ScreenOverlayParams {
  resolution: vec2f,
  time: f32,
  mode: f32,
  intensity: f32,
  grain: f32,
  dither: f32,
  scanlines: f32,
  vignette: f32,
}

@group(0) @binding(0) var<uniform> overlay_params: ScreenOverlayParams;

fn overlay_hash(position: vec2f, frame: f32) -> f32 {
  let seed = dot(position + vec2f(frame * 17.17, frame * 5.13), vec2f(12.9898, 78.233));
  return fract(sin(seed) * 43758.5453);
}

fn overlay_bayer2(position: vec2u) -> u32 {
  return select(
    select(0u, 2u, position.x == 1u),
    select(3u, 1u, position.x == 1u),
    position.y == 1u,
  );
}

fn overlay_bayer4(position: vec2u) -> f32 {
  let high = overlay_bayer2(position & vec2u(1u));
  let low = overlay_bayer2((position >> vec2u(1u)) & vec2u(1u));
  return (f32(high * 4u + low) + 0.5) / 16.0 - 0.5;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let is_crt = overlay_params.mode < 1.5;
  let is_grain = overlay_params.mode >= 1.5 && overlay_params.mode < 2.5;
  let is_dither = overlay_params.mode >= 2.5 && overlay_params.mode < 3.5;
  let is_scanlines = overlay_params.mode >= 3.5 && overlay_params.mode < 4.5;
  let pixel = vec2u(max(vec2f(0.0), floor(uv * overlay_params.resolution)));
  let frame = floor(overlay_params.time * 24.0);
  var dark_alpha = 0.0;
  var light_alpha = 0.0;

  if (is_crt || is_grain) {
    let grain_signal = overlay_hash(vec2f(pixel), frame) * 2.0 - 1.0;
    let grain_alpha = abs(grain_signal) * overlay_params.grain * overlay_params.intensity * 0.13;
    dark_alpha += select(0.0, grain_alpha, grain_signal < 0.0);
    light_alpha += select(0.0, grain_alpha, grain_signal >= 0.0);
  }

  if (is_crt || is_dither) {
    let dither_signal = overlay_bayer4(pixel);
    let dither_alpha = abs(dither_signal) * overlay_params.dither * overlay_params.intensity * 0.2;
    dark_alpha += select(0.0, dither_alpha, dither_signal < 0.0);
    light_alpha += select(0.0, dither_alpha, dither_signal >= 0.0);
  }

  if (is_crt || is_scanlines) {
    let scan = pow(0.5 + 0.5 * sin(f32(pixel.y) * 1.57079633), 3.0);
    dark_alpha += scan * overlay_params.scanlines * overlay_params.intensity * 0.2;
  }

  if (is_crt) {
    let centered = uv * 2.0 - 1.0;
    let edge = max(abs(centered.x), abs(centered.y));
    dark_alpha += smoothstep(0.48, 1.0, edge) * overlay_params.vignette * overlay_params.intensity * 0.68;
  }

  light_alpha = clamp(light_alpha, 0.0, 0.22);
  dark_alpha = clamp(dark_alpha, 0.0, 0.72);
  let alpha = light_alpha + dark_alpha * (1.0 - light_alpha);

  return vec4f(vec3f(light_alpha), alpha);
}
