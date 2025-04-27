#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 outColor;

void main() {
  vec2 uv = v_uv;
  vec2 center = vec2(0.5f);
  vec2 dir = center - uv;
  float samples = 8.0f;
  float decay = 0.85f;
  vec4 color = vec4(0.0f);
  vec2 step = dir / samples;

  vec2 pos = uv;
  for (float i = 0.0f; i < samples; i++) {
    color += texture(u_texture, pos) * pow(decay, i);
    pos += step;
  }
  color /= samples;
  outColor = color;
}
