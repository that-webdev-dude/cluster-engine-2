#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_texture;
uniform sampler2D u_palette;  // 1D palette texture
out vec4 outColor;

void main() {
    vec4 src = texture(u_texture, v_uv);
  // Compute luminance to look up palette
    float lum = dot(src.rgb, vec3(0.299f, 0.587f, 0.114f));
    outColor = texture(u_palette, vec2(lum, 0.0f));
    outColor.a = src.a;
}