import { page_effect_bayer, page_effect_halftone, page_effect_quantize } from "./dither.wgsl";
import { page_effect_grain } from "./grain.wgsl";
import { rendering_adjust_color } from "../../../rendering/color-adjustment.wgsl";

struct PageEffectParams {
  resolution: vec2f,
  time: f32,
  frame_rate: f32,
  mode: f32,
  intensity: f32,
  grain: f32,
  dither: f32,
  dither_pattern: f32,
  bayer_matrix_size: f32,
  pattern_scale: f32,
  halftone_dot_size: f32,
  halftone_angle: f32,
  palette_levels: f32,
  saturation: f32,
  contrast: f32,
  grayscale: f32,
  scanlines: f32,
  scanline_spacing: f32,
  scanline_thickness: f32,
  curvature: f32,
  vignette: f32,
  chromatic_aberration: f32,
  logo_bounds: vec4f,
  logo_enabled: f32,
}

@group(0) @binding(0) var page_source: texture_2d<f32>;
@group(0) @binding(1) var page_sampler: sampler;
@group(0) @binding(2) var<uniform> page_params: PageEffectParams;
@group(0) @binding(3) var logo_source: texture_2d<f32>;

fn warped_uv(uv: vec2f, curvature: f32) -> vec2f {
  let centered = uv * 2.0 - 1.0;
  let radius = dot(centered, centered);
  return (centered * (1.0 + radius * curvature * 0.16)) * 0.5 + 0.5;
}

fn sample_composite(uv: vec2f) -> vec4f {
  var page = textureSampleLevel(page_source, page_sampler, uv, 0.0);
  let logo_size = page_params.logo_bounds.zw;
  let logo_uv = (uv - page_params.logo_bounds.xy) / max(logo_size, vec2f(0.000001));
  let within_logo = page_params.logo_enabled > 0.5
    && all(logo_uv >= vec2f(0.0))
    && all(logo_uv <= vec2f(1.0));
  if (within_logo) {
    let logo = textureSampleLevel(logo_source, page_sampler, logo_uv, 0.0);
    page = vec4f(logo.rgb + page.rgb * (1.0 - logo.a), logo.a + page.a * (1.0 - logo.a));
  }
  return page;
}

fn sample_page(uv: vec2f, chroma: f32) -> vec3f {
  let centered = uv * 2.0 - 1.0;
  let radial = centered * chroma * 0.0025;
  let red = sample_composite(uv + radial).r;
  let green = sample_composite(uv).g;
  let blue = sample_composite(uv - radial).b;
  return vec3f(red, green, blue);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let is_crt = page_params.mode < 1.5;
  let is_grain = page_params.mode >= 1.5 && page_params.mode < 2.5;
  let curve_amount = select(0.0, page_params.curvature * page_params.intensity, is_crt);
  let sample_uv = warped_uv(uv, curve_amount);

  if (any(sample_uv < vec2f(0.0)) || any(sample_uv > vec2f(1.0))) {
    return vec4f(0.0);
  }

  let chroma = select(0.0, page_params.chromatic_aberration * page_params.intensity, is_crt);
  var color = sample_page(sample_uv, chroma);
  let pixel = vec2u(max(vec2f(0.0), floor(uv * page_params.resolution)));

  color = rendering_adjust_color(
    color,
    page_params.contrast,
    page_params.saturation,
    page_params.grayscale,
  );

  if (!is_grain && page_params.dither > 0.0) {
    let amount = page_params.dither * page_params.intensity;
    if (page_params.dither_pattern < 0.5) {
      let threshold = page_effect_bayer(
        pixel,
        page_params.bayer_matrix_size,
        page_params.pattern_scale,
      ) * amount;
      color = mix(
        color,
        page_effect_quantize(color, page_params.palette_levels, threshold),
        amount,
      );
    } else {
      color = mix(
        color,
        page_effect_halftone(
          color,
          vec2f(pixel),
          page_params.pattern_scale,
          page_params.halftone_angle,
          page_params.halftone_dot_size,
        ),
        amount,
      );
    }
  }

  let frame = floor(page_params.time * page_params.frame_rate);
  let noise = page_effect_grain(vec2f(pixel), frame);
  color += noise * page_params.grain * page_params.intensity * 0.075;

  if (is_crt) {
    let scanline_phase = fract(
      (uv.y * page_params.resolution.y) / max(1.0, page_params.scanline_spacing),
    );
    let scanline_edge = min(0.98, page_params.scanline_thickness + 0.08);
    let scan = 1.0 - smoothstep(page_params.scanline_thickness, scanline_edge, scanline_phase);
    color *= 1.0 - scan * page_params.scanlines * page_params.intensity * 0.22;
  }

  let centered = uv * 2.0 - 1.0;
  let edge = max(abs(centered.x), abs(centered.y));
  let vignette = smoothstep(0.42, 1.05, edge);
  color *= 1.0 - vignette * page_params.vignette * page_params.intensity * 0.72;

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
