fn foil_aspect(resolution: vec2f) -> vec2f {
  let shortest_side = max(min(resolution.x, resolution.y), 1.0);
  return resolution / shortest_side;
}

fn foil_light_delta(
  uv: vec2f,
  pointer: vec2f,
  resolution: vec2f,
) -> vec2f {
  return (pointer - uv) * foil_aspect(resolution);
}

export fn foil_surface_normal(
  uv: vec2f,
  surface_tilt: vec2f,
  relief: f32,
  groove_angle: f32,
  groove_density: f32,
  groove_warp: f32,
  texture_noise: f32,
) -> vec3f {
  let pitch = surface_tilt.x;
  let yaw = surface_tilt.y;
  let plane_normal = normalize(vec3f(
    sin(yaw),
    -sin(pitch),
    cos(pitch) * cos(yaw),
  ));
  let groove_direction = vec2f(cos(groove_angle), sin(groove_angle));
  let cross_direction = vec2f(-groove_direction.y, groove_direction.x);
  let primary_phase = dot(uv, groove_direction)
    * max(groove_density, 1.0)
    * 6.2831853
    + texture_noise * groove_warp * 3.0;
  let cross_phase = dot(uv, cross_direction)
    * max(groove_density, 1.0)
    * 2.31
    - texture_noise * groove_warp * 1.7;
  let micro_gradient = groove_direction * cos(primary_phase)
    + cross_direction * cos(cross_phase) * 0.28;
  return normalize(
    plane_normal + vec3f(micro_gradient * max(relief, 0.0) * 0.085, 0.0),
  );
}

export fn foil_light_direction(
  uv: vec2f,
  pointer: vec2f,
  resolution: vec2f,
  light_height: f32,
) -> vec3f {
  let delta = foil_light_delta(uv, pointer, resolution);
  return normalize(vec3f(delta, max(light_height, 0.04)));
}

export fn foil_point_falloff(
  uv: vec2f,
  pointer: vec2f,
  resolution: vec2f,
  light_radius: f32,
) -> f32 {
  let delta = foil_light_delta(uv, pointer, resolution);
  let radius = max(light_radius, 0.03);
  return 1.0 / (1.0 + dot(delta, delta) / (radius * radius));
}

export fn foil_specular(
  normal: vec3f,
  light_direction: vec3f,
  roughness: f32,
  falloff: f32,
) -> f32 {
  let view_direction = vec3f(0.0, 0.0, 1.0);
  let half_direction = normalize(light_direction + view_direction);
  let safe_roughness = clamp(roughness, 0.05, 1.0);
  let exponent = mix(160.0, 6.0, safe_roughness * safe_roughness);
  let highlight = pow(clamp(dot(normal, half_direction), 0.0, 1.0), exponent);
  let fresnel = 0.04 + 0.96 * pow(
    1.0 - clamp(dot(normal, view_direction), 0.0, 1.0),
    5.0,
  );
  return highlight * mix(0.4, 1.0, fresnel) * falloff;
}

export fn foil_pointer_streak(
  uv: vec2f,
  pointer: vec2f,
  resolution: vec2f,
  light_radius: f32,
  streak_width: f32,
) -> f32 {
  let delta = foil_light_delta(uv, pointer, resolution);
  let axis = normalize(vec2f(0.76, -0.65));
  let across = dot(delta, vec2f(-axis.y, axis.x));
  let along = dot(delta, axis);
  let width = 0.075 * clamp(streak_width, 0.5, 2.0);
  let streak_length = max(0.18, light_radius * 1.3);
  return exp(-(
    across * across / max(width * width, 0.0001)
      + along * along / max(streak_length * streak_length, 0.0001)
  ));
}
