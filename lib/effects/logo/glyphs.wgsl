import { rendering_adjust_color } from "../../rendering/color-adjustment.wgsl";

struct GlyphInstance {
  position: vec2f,
  tuning: vec2f,
  color: vec4f,
  offset: vec2f,
  mask_a: vec2u,
  mask_b: vec2u,
  mask_c: vec2u,
  style: u32,
  visible: u32,
  scale: f32,
  glow: f32,
}

@group(0) @binding(0) var<storage, read> glyphs: array<GlyphInstance>;
@group(0) @binding(1) var<uniform> glyph_color_adjustment: vec4f;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec4f,
  @location(2) @interpolate(flat) mask_a: vec2u,
  @location(3) @interpolate(flat) mask_b: vec2u,
  @location(4) @interpolate(flat) mask_c: vec2u,
  @location(5) @interpolate(flat) style: u32,
  @location(6) @interpolate(flat) visible: u32,
  @location(7) @interpolate(flat) glow: f32,
  @location(8) @interpolate(flat) pixel_size: f32,
  @location(9) @interpolate(flat) scanlines: f32,
}

@vertex fn vertex_main(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
  let corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
  );
  let glyph = glyphs[instance_index];
  let corner = (corners[vertex] - 0.5) * glyph.scale + 0.5;
  let grid_position = glyph.position + glyph.offset + corner;
  let grid_size = vec2f(81.0, 10.0);

  var output: VertexOutput;
  output.position = vec4f(
    grid_position.x / grid_size.x * 2.0 - 1.0,
    1.0 - grid_position.y / grid_size.y * 2.0,
    0.0,
    1.0,
  );
  output.local = corners[vertex];
  output.color = glyph.color;
  output.mask_a = glyph.mask_a;
  output.mask_b = glyph.mask_b;
  output.mask_c = glyph.mask_c;
  output.style = glyph.style;
  output.visible = glyph.visible;
  output.glow = glyph.glow;
  output.pixel_size = glyph.tuning.x;
  output.scanlines = glyph.tuning.y;
  return output;
}

fn dither_alpha(style: u32, local: vec2f) -> f32 {
  let sample_position = vec2u(floor(local * vec2f(10.0, 14.0)));
  let pattern = (sample_position.x + sample_position.y * 3u) % 4u;
  if style == 4u { return select(0.0, 1.0, pattern == 0u); }
  if style == 5u { return select(0.0, 1.0, pattern < 2u); }
  return select(0.0, 1.0, pattern < 3u);
}

fn mask_bit(input: VertexOutput, bit: u32) -> bool {
  let words = array<u32, 6>(
    input.mask_a.x,
    input.mask_a.y,
    input.mask_b.x,
    input.mask_b.y,
    input.mask_c.x,
    input.mask_c.y,
  );
  return ((words[bit / 32u] >> (bit % 32u)) & 1u) == 1u;
}

@fragment fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  if input.visible == 0u { discard; }

  var coverage = 0.0;
  if input.style == 0u {
    let grid = input.local * vec2f(5.0, 7.0);
    let pixel = vec2u(min(floor(grid), vec2f(4.0, 6.0)));
    let bit = pixel.y * 5u + pixel.x;
    let is_set = mask_bit(input, bit);
    let within = fract(grid);
    let pixel_width = clamp(0.84 * input.pixel_size, 0.18, 1.0);
    let pixel_height = clamp(0.88 * input.pixel_size, 0.18, 1.0);
    let pixel_shape = select(0.0, 1.0, within.x < pixel_width && within.y < pixel_height);
    coverage = select(0.0, pixel_shape, is_set);
  } else if input.style == 8u {
    let grid = input.local * vec2f(12.0, 16.0);
    let pixel = vec2u(min(floor(grid), vec2f(11.0, 15.0)));
    let bit = pixel.y * 12u + pixel.x;
    let within = fract(grid);
    let pixel_width = clamp(0.92 * input.pixel_size, 0.18, 1.0);
    let pixel_height = clamp(0.94 * input.pixel_size, 0.18, 1.0);
    let pixel_shape = select(0.0, 1.0, within.x < pixel_width && within.y < pixel_height);
    coverage = select(0.0, pixel_shape, mask_bit(input, bit));
  } else if input.style == 1u {
    coverage = 1.0;
  } else if input.style == 2u {
    coverage = select(0.0, 1.0, input.local.y >= 0.5);
  } else if input.style == 3u {
    coverage = select(0.0, 1.0, input.local.y <= 0.5);
  } else if input.style <= 6u {
    coverage = dither_alpha(input.style, input.local);
  } else {
    let distance_from_center = distance(input.local, vec2f(0.5));
    coverage = 1.0 - smoothstep(0.08, 0.5, distance_from_center);
    coverage += input.glow * (1.0 - smoothstep(0.15, 0.72, distance_from_center)) * 0.32;
  }

  let alpha = clamp(coverage * input.color.a, 0.0, 1.0);
  if alpha <= 0.001 { discard; }
  let scanline_pattern = select(
    0.9,
    1.0,
    u32(floor(input.local.y * 14.0)) % 2u == 0u,
  );
  let pixel_line = mix(1.0, scanline_pattern, input.scanlines);
  let lit_color = mix(
    input.color.rgb * pixel_line,
    vec3f(1.0),
    clamp(input.glow * 0.28, 0.0, 0.28),
  );
  let adjusted_color = rendering_adjust_color(
    lit_color,
    glyph_color_adjustment.x,
    glyph_color_adjustment.y,
    glyph_color_adjustment.z,
  );
  return vec4f(clamp(adjusted_color, vec3f(0.0), vec3f(1.0)), alpha);
}
