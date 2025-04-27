#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_texture;  // the sceneFBO texture
out vec4 outColor;

void main() {
  // 1) get the actual FBO texture dimensions
  ivec2 texSize = textureSize(u_texture, 0);
  vec2 onePx = 1.0f / vec2(texSize);

  // 2) sample center alpha
  float alpha = texture(u_texture, v_uv).a;
  if (alpha < 0.01f)
    discard;

  // 3) sum four neighbors
  float sum = 0.0f;
  sum += texture(u_texture, v_uv + vec2(-onePx.x, 0)).a;
  sum += texture(u_texture, v_uv + vec2(onePx.x, 0)).a;
  sum += texture(u_texture, v_uv + vec2(0, -onePx.y)).a;
  sum += texture(u_texture, v_uv + vec2(0, onePx.y)).a;

  // 4) outline if any neighbor is transparent
  if (sum < 4.0f) {
    outColor = vec4(0.0f, 0.0f, 0.0f, 1.0f);
  } else {
    outColor = texture(u_texture, v_uv);
  }
}
