import {
  foil_edge_mask,
  foil_texture_mask,
} from "../foil/mask.wgsl";
import {
  foil_light_direction,
  foil_point_falloff,
  foil_pointer_streak,
  foil_specular,
  foil_surface_normal,
} from "../foil/light.wgsl";
import {
  foil_breakup,
  foil_sparkle,
  foil_spectrum,
  foil_texture_noise,
} from "../foil/material.wgsl";

struct PatronBadgeGlareParams {
  resolution: vec2f,
  pointer: vec2f,
  surface_tilt: vec2f,
  intensity: f32,
  phase: f32,
  texture_brightness: f32,
  texture_softness: f32,
  texture_threshold: f32,
  band_width: f32,
  color: f32,
  debug_view: f32,
  edge_strength: f32,
  edge_width: f32,
  foil_texture: f32,
  glare_strength: f32,
  groove_angle: f32,
  groove_density: f32,
  light_height: f32,
  light_radius: f32,
  mask_mode: f32,
  rainbow_density: f32,
  relief: f32,
  roughness: f32,
  sparkle_density: f32,
  sparkle_strength: f32,
  surface_strength: f32,
}

@group(0) @binding(0) var badge_source: texture_2d<f32>;
@group(0) @binding(1) var badge_sampler: sampler;
@group(0) @binding(2) var<uniform> glare_params: PatronBadgeGlareParams;

fn safe_badge_sample(uv: vec2f) -> vec4f {
  let inside = all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0));
  let sampled = textureSampleLevel(
    badge_source,
    badge_sampler,
    clamp(uv, vec2f(0.0), vec2f(1.0)),
    0.0,
  );
  return sampled * select(0.0, 1.0, inside);
}

fn srgb_to_linear(color: vec3f) -> vec3f {
  let low = color / 12.92;
  let high = pow((color + vec3f(0.055)) / 1.055, vec3f(2.4));
  return mix(low, high, step(vec3f(0.04045), color));
}

fn linear_to_srgb(color: vec3f) -> vec3f {
  let safe_color = max(color, vec3f(0.0));
  let low = safe_color * 12.92;
  let high = 1.055 * pow(safe_color, vec3f(1.0 / 2.4)) - vec3f(0.055);
  return mix(low, high, step(vec3f(0.0031308), safe_color));
}

fn premultiplied(color: vec3f, alpha: f32) -> vec4f {
  return vec4f(color * alpha, alpha);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let source = safe_badge_sample(uv);
  if (source.a <= 0.001) {
    return vec4f(0.0);
  }

  let safe_resolution = max(glare_params.resolution, vec2f(1.0));
  let sample_step = vec2f(max(glare_params.edge_width, 0.5)) / safe_resolution;
  let left = safe_badge_sample(uv - vec2f(sample_step.x, 0.0));
  let right = safe_badge_sample(uv + vec2f(sample_step.x, 0.0));
  let above = safe_badge_sample(uv - vec2f(0.0, sample_step.y));
  let below = safe_badge_sample(uv + vec2f(0.0, sample_step.y));

  let texture_mask = foil_texture_mask(
    source,
    left,
    right,
    above,
    below,
    glare_params.texture_threshold,
    glare_params.texture_softness,
    glare_params.texture_brightness,
  );
  let edge_mask = foil_edge_mask(source, left, right, above, below);

  var coverage = texture_mask;
  if (glare_params.mask_mode > 1.5) {
    coverage = edge_mask * glare_params.edge_strength;
  } else if (glare_params.mask_mode > 0.5) {
    coverage = max(texture_mask, edge_mask * glare_params.edge_strength);
  }
  coverage = clamp(coverage * glare_params.surface_strength, 0.0, 1.0);

  let texture_noise = foil_texture_noise(
    uv,
    glare_params.phase,
    glare_params.foil_texture,
  );
  let normal = foil_surface_normal(
    uv,
    glare_params.surface_tilt,
    glare_params.relief,
    glare_params.groove_angle,
    glare_params.groove_density,
    glare_params.foil_texture,
    texture_noise,
  );
  let light_direction = foil_light_direction(
    uv,
    glare_params.pointer,
    safe_resolution,
    glare_params.light_height,
  );
  let view_direction = vec3f(0.0, 0.0, 1.0);
  let half_direction = normalize(light_direction + view_direction);
  let reflection_direction = reflect(-light_direction, normal);
  let facing = clamp(dot(normal, light_direction), 0.0, 1.0);
  let half_facing = clamp(dot(normal, half_direction), 0.0, 1.0);
  let falloff = foil_point_falloff(
    uv,
    glare_params.pointer,
    safe_resolution,
    glare_params.light_radius,
  );
  let specular = foil_specular(
    normal,
    light_direction,
    glare_params.roughness,
    falloff,
  );
  let streak = foil_pointer_streak(
    uv,
    glare_params.pointer,
    safe_resolution,
    glare_params.light_radius,
    glare_params.band_width,
  );
  let breakup = foil_breakup(texture_noise, glare_params.foil_texture);
  let spectrum = foil_spectrum(
    uv,
    reflection_direction,
    glare_params.groove_angle,
    glare_params.rainbow_density,
    glare_params.phase,
    texture_noise,
  );
  let broad_reflection = falloff * (0.16 + facing * 0.84);
  let reflection_shape = clamp(
    (broad_reflection * 0.18 + specular * 1.35 + streak * 0.28) * breakup,
    0.0,
    2.0,
  );
  let interaction = clamp(
    glare_params.intensity * glare_params.glare_strength,
    0.0,
    2.0,
  );
  let reflection_amount = coverage * interaction * reflection_shape;
  let sparkle = foil_sparkle(
    uv,
    half_facing,
    glare_params.phase,
    glare_params.sparkle_density,
  ) * coverage * interaction * glare_params.sparkle_strength;

  if (glare_params.debug_view > 0.5 && glare_params.debug_view < 1.5) {
    return premultiplied(vec3f(coverage), source.a);
  }
  if (glare_params.debug_view > 1.5 && glare_params.debug_view < 2.5) {
    return premultiplied(vec3f(edge_mask), source.a);
  }
  if (glare_params.debug_view > 2.5 && glare_params.debug_view < 3.5) {
    return premultiplied(normal * 0.5 + vec3f(0.5), source.a);
  }
  if (glare_params.debug_view > 3.5) {
    let preview_reflection = coverage
      * max(interaction, 0.9)
      * reflection_shape;
    let preview_color = mix(vec3f(1.0), spectrum, glare_params.color);
    return premultiplied(
      clamp(
        preview_color * preview_reflection * 2.5 + vec3f(sparkle),
        vec3f(0.0),
        vec3f(1.0),
      ),
      source.a,
    );
  }

  if (interaction <= 0.001) {
    return premultiplied(source.rgb, source.a);
  }

  let base_linear = srgb_to_linear(source.rgb);
  let rainbow_color = mix(vec3f(1.0), spectrum, glare_params.color);
  let white_hotspot = smoothstep(0.2, 0.9, specular) * 0.5;
  let reflection_color = mix(rainbow_color, vec3f(1.0), white_hotspot);
  let reflection_linear = srgb_to_linear(reflection_color);
  let base_attenuation = 1.0 - clamp(reflection_amount * 0.2, 0.0, 0.38);
  let final_linear = base_linear * base_attenuation
    + reflection_linear * reflection_amount * 0.78
    + vec3f(sparkle);
  let final_srgb = linear_to_srgb(clamp(final_linear, vec3f(0.0), vec3f(1.0)));
  return premultiplied(final_srgb, source.a);
}
