// Glass optics reference: vgpu transmission/glass.wgsl at 2de6899b38e4.
// Geometry comes from the brand SVG's signed distance texture, not a traced copy.
struct Experiment {
  resolution: vec2f,
  pointer: vec2f,
  background: vec3f,
  accent: vec3f,
  highlight: vec3f,
  time: f32,
  scale: f32,
  tilt: f32,
  ior: f32,
  dispersion: f32,
  frost: f32,
  light: f32,
  opacity: f32,
  orb: f32,
  wobble: f32,
}
@group(0) @binding(0) var logo_field: texture_2d<f32>;
@group(0) @binding(1) var<uniform> scene: Experiment;
const logo_depth = 0.18;

fn rotate(p: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn logo_distance(point: vec2f) -> f32 {
  let uv = vec2f(point.x, -point.y) / 2.4 + 0.5;
  let extent = vec2f(textureDimensions(logo_field));
  let pixel = clamp(uv, vec2f(0.0), vec2f(1.0)) * (extent - 1.0);
  let cell = vec2i(floor(pixel));
  let next = min(cell + vec2i(1), vec2i(extent) - 1);
  let blend = fract(pixel);
  let top = mix(textureLoad(logo_field, cell, 0).r, textureLoad(logo_field, vec2i(next.x, cell.y), 0).r, blend.x);
  let bottom = mix(textureLoad(logo_field, vec2i(cell.x, next.y), 0).r, textureLoad(logo_field, next, 0).r, blend.x);
  return mix(top, bottom, blend.y) + length(max(abs(point) - 1.2, vec2f(0.0)));
}

fn shape_scale() -> f32 {
  return scene.scale * mix(1.7, 1.0, scene.orb);
}

fn orb_gaze() -> vec3f {
  return normalize(vec3f(scene.pointer.x * scene.tilt * 1.2, 0.38 - scene.pointer.y * scene.tilt, 1.0));
}

// Keep the upstream's slow object-space flow, with a slight lean toward the
// gaze. The raised center leaves the focal point visible above the wordmark.
fn orb_distance(p: vec3f) -> f32 {
  let q = p - vec3f(0.0, 0.3, 0.0);
  let direction = q / max(length(q), 0.0001);
  let wave = sin(dot(direction, vec3f(0.81, 0.32, 0.49)) * 3.4 + scene.time * 0.85) * 0.055
    + sin(dot(direction, vec3f(-0.36, 0.91, 0.18)) * 4.7 - scene.time * 0.72) * 0.035
    + sin(dot(direction, vec3f(0.21, -0.46, 0.86)) * 6.1 + scene.time * 0.48) * 0.022;
  let breath = sin(scene.time * 1.8) * 0.012;
  let lean = pow(max(dot(direction, orb_gaze()), 0.0), 8.0) * 0.055;
  return length(q) - (0.9 + wave * scene.wobble + breath + lean);
}

fn distance_to_logo(world: vec3f) -> f32 {
  let scale = shape_scale();
  var p = world / scale;
  var sphere = 0.0;
  if (scene.orb > 0.0) { sphere = orb_distance(p); }
  if (scene.orb >= 0.999) { return sphere * scale; }
  let pitch = 0.35 + sin(scene.time * 0.7) * 0.22 + scene.pointer.y * scene.tilt;
  let yaw = -0.45 + sin(scene.time * 0.43) * 0.45 + scene.pointer.x * scene.tilt;
  let yz = rotate(p.yz, pitch);
  p = vec3f(p.x, yz);
  let xz = rotate(p.xz, yaw);
  p = vec3f(xz.x, p.y, xz.y);
  let xy = rotate(p.xy, -0.3 + sin(scene.time * 0.3) * 0.12);
  let d = vec2f(logo_distance(xy), abs(p.z) - logo_depth);
  let logo = length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0) - 0.025;
  return mix(logo, sphere, scene.orb) * scale;
}

// A soft patch of light follows the gaze through the glass. No pupil, iris
// or white ring: attention is conveyed by motion and a gentle colored glow.
fn orb_focus(p: vec3f, material: vec3f) -> vec3f {
  let direction = normalize(p / shape_scale() - vec3f(0.0, 0.3, 0.0));
  let gaze = orb_gaze();
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), gaze));
  let up = cross(gaze, right);
  let focus = vec2f(dot(direction, right), dot(direction, up)) * vec2f(1.0, 1.15);
  let radiusSquared = dot(focus, focus);
  let front = smoothstep(0.5, 0.85, dot(direction, gaze));
  let breath = 0.94 + sin(scene.time * 1.8) * 0.06;
  let halo = exp(-radiusSquared * 12.0) * 0.32;
  let center = exp(-radiusSquared * 70.0) * 0.36;
  let glow = (halo + center) * breath * front * scene.orb;
  let tint = mix(scene.background, scene.accent, 0.72) * min(scene.light, 1.3);
  return mix(material, tint, glow);
}

fn normal_at(p: vec3f) -> vec3f {
  let e = 0.003;
  return normalize(vec3f(
    distance_to_logo(p + vec3f(e, 0, 0)) - distance_to_logo(p - vec3f(e, 0, 0)),
    distance_to_logo(p + vec3f(0, e, 0)) - distance_to_logo(p - vec3f(0, e, 0)),
    distance_to_logo(p + vec3f(0, 0, e)) - distance_to_logo(p - vec3f(0, 0, e))
  ));
}

fn studio(direction: vec3f) -> vec3f {
  let d = normalize(direction);
  let sweep = scene.time * 0.17;
  let strip = exp(-pow((d.x + d.y * 0.45 + sin(sweep) * 0.25) * mix(15.0, 4.0, scene.frost), 2.0));
  let rim = pow(max(dot(d, normalize(vec3f(-0.7, 0.8, 0.6))), 0.0), mix(24.0, 4.0, scene.frost));
  let blue = pow(max(dot(d, normalize(vec3f(0.9, -0.2, 0.7))), 0.0), 8.0);
  return scene.background * 0.55 + scene.light * (
    scene.highlight * (strip * 0.85 + rim * 0.7) +
    scene.accent * (blue * 0.9 + 0.1)
  );
}

fn glass(p: vec3f, incident: vec3f, normal: vec3f) -> vec3f {
  let facing = clamp(dot(-incident, normal), 0.0, 1.0);
  let f0 = pow((scene.ior - 1.0) / (scene.ior + 1.0), 2.0);
  let fresnel = f0 + (1.0 - f0) * pow(1.0 - facing, 5.0);
  let redRay = refract(incident, normal, 1.0 / max(1.0, scene.ior - scene.dispersion));
  let greenRay = refract(incident, normal, 1.0 / scene.ior);
  let blueRay = refract(incident, normal, 1.0 / (scene.ior + scene.dispersion));
  let transmitted = vec3f(studio(redRay).r, studio(greenRay).g, studio(blueRay).b);
  let path = min(mix(logo_depth * 2.0, 1.8, scene.orb) / max(facing, 0.15), 2.0);
  let absorption = exp(-(vec3f(1.0) - scene.accent) * path * 1.6);
  let reflection = studio(reflect(incident, normal));
  let iridescence = 0.5 + 0.5 * cos(vec3f(0.0, 2.1, 4.2) + facing * 13.0 + p.z * 5.0);
  let body = mix(scene.background, transmitted, 0.35 + scene.frost * 0.35) * absorption;
  return mix(body, reflection, clamp(fresnel + 0.18, 0.0, 1.0))
    + iridescence * scene.dispersion * pow(1.0 - facing, 2.0) * scene.light;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let screen = (uv - 0.5) * vec2f(scene.resolution.x / scene.resolution.y, -1.0) * 2.0;
  let origin = vec3f(0.0, 0.0, 3.5);
  let ray = normalize(vec3f(screen, -2.7));
  let radius = 1.65 * shape_scale();
  let b = dot(origin, ray);
  let discriminant = b * b - dot(origin, origin) + radius * radius;
  if (discriminant < 0.0) { return vec4f(scene.background, 1.0); }
  var distance = max(0.0, -b - sqrt(discriminant));
  let end = -b + sqrt(discriminant);
  var hit = false;
  // Conservative steps accommodate the SVG distance approximation.
  let safety = 0.65;
  for (var step = 0; step < 112; step++) {
    let d = distance_to_logo(origin + ray * distance);
    if (d < 0.0015) { hit = true; break; }
    distance += max(d * safety, 0.0008);
    if (distance > end) { break; }
  }
  if (!hit) { return vec4f(scene.background, 1.0); }
  let p = origin + ray * distance;
  let normal = normal_at(p);
  var material = glass(p, ray, normal);
  if (scene.orb > 0.0) { material = orb_focus(p, material); }
  material = clamp(material, vec3f(0.0), vec3f(1.0));
  return vec4f(mix(scene.background, material, scene.opacity), 1.0);
}
