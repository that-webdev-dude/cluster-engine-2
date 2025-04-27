#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_texture;
out vec4 outColor;

void main() {
  vec2 uv = v_uv;
  vec4 tex = texture(u_texture, uv);

  // scanline: darken odd lines
  float scan = mod(gl_FragCoord.y, 2.0f) < 1.0f ? 0.9f : 1.0f;
  tex.rgb *= scan;

  // vignette
  vec2 centered = uv - 0.5f;
  float dist = length(centered);
  float vig = smoothstep(0.5f, 0.8f, dist);
  tex.rgb *= mix(1.0f, 0.6f, vig);

  outColor = tex;
}