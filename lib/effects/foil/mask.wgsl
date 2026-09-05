fn foil_luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

fn foil_premultiplied_luminance(sample: vec4f) -> f32 {
  return foil_luminance(sample.rgb) * sample.a;
}

export fn foil_edge_mask(
  source: vec4f,
  left: vec4f,
  right: vec4f,
  above: vec4f,
  below: vec4f,
) -> f32 {
  let neighbor_min = min(min(left.a, right.a), min(above.a, below.a));
  let silhouette = smoothstep(0.02, 0.55, max(source.a - neighbor_min, 0.0));
  let detail_gradient = length(vec2f(
    foil_premultiplied_luminance(right) - foil_premultiplied_luminance(left),
    foil_premultiplied_luminance(below) - foil_premultiplied_luminance(above),
  ));
  let detail = smoothstep(0.025, 0.18, detail_gradient);
  return clamp(max(silhouette, detail * 0.35), 0.0, 1.0);
}

export fn foil_texture_mask(
  source: vec4f,
  left: vec4f,
  right: vec4f,
  above: vec4f,
  below: vec4f,
  selectivity: f32,
  softness: f32,
  brightness_floor: f32,
) -> f32 {
  let neighbor_alpha = min(min(left.a, right.a), min(above.a, below.a));
  let interior = smoothstep(0.2, 0.92, neighbor_alpha);
  if (interior <= 0.001) {
    return 0.0;
  }

  let center_luminance = foil_luminance(source.rgb);
  let left_luminance = foil_luminance(left.rgb);
  let right_luminance = foil_luminance(right.rgb);
  let above_luminance = foil_luminance(above.rgb);
  let below_luminance = foil_luminance(below.rgb);
  let neighborhood_luminance = (
    left_luminance
      + right_luminance
      + above_luminance
      + below_luminance
  ) * 0.25;
  let luminance_gradient = length(vec2f(
    right_luminance - left_luminance,
    below_luminance - above_luminance,
  ));
  let local_contrast = abs(center_luminance - neighborhood_luminance);
  let color_detail = max(
    max(length(source.rgb - left.rgb), length(source.rgb - right.rgb)),
    max(length(source.rgb - above.rgb), length(source.rgb - below.rgb)),
  ) * 0.57735027;
  let detail = clamp(
    max(max(local_contrast * 2.2, luminance_gradient * 0.75), color_detail * 0.55) * 3.5,
    0.0,
    1.0,
  );

  let brightest = max(source.r, max(source.g, source.b));
  let detail_threshold = clamp(selectivity, 0.0, 0.8) * 0.5;
  let detail_coverage = smoothstep(
    detail_threshold,
    min(detail_threshold + max(softness * 0.32, 0.015), 1.0),
    detail,
  );
  let brightness_coverage = smoothstep(
    brightness_floor * 0.5,
    min(brightness_floor * 0.5 + max(softness * 0.5, 0.025), 1.0),
    brightest,
  );
  return source.a * interior * detail_coverage * brightness_coverage;
}
