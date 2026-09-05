export fn rendering_adjust_color(
  color: vec3f,
  contrast: f32,
  saturation: f32,
  grayscale: f32,
) -> vec3f {
  var adjusted = (color - vec3f(0.5)) * contrast + vec3f(0.5);
  let luminance = dot(adjusted, vec3f(0.2126, 0.7152, 0.0722));
  adjusted = mix(vec3f(luminance), adjusted, saturation);
  let grayscale_luminance = dot(adjusted, vec3f(0.2126, 0.7152, 0.0722));
  return mix(adjusted, vec3f(grayscale_luminance), grayscale);
}
