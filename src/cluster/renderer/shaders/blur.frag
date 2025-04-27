#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_direction; // (1,0) or (0,1)
out vec4 outColor;
void main() {
    vec2 off = 1.0f / vec2(textureSize(u_texture, 0));
    vec4 sum = vec4(0.0f);
    sum += texture(u_texture, v_uv - 4.0f * off * u_direction) * 0.05f;
    sum += texture(u_texture, v_uv - 3.0f * off * u_direction) * 0.09f;
    sum += texture(u_texture, v_uv - 2.0f * off * u_direction) * 0.12f;
    sum += texture(u_texture, v_uv - 1.0f * off * u_direction) * 0.15f;
    sum += texture(u_texture, v_uv) * 0.16f;
    sum += texture(u_texture, v_uv + 1.0f * off * u_direction) * 0.15f;
    sum += texture(u_texture, v_uv + 2.0f * off * u_direction) * 0.12f;
    sum += texture(u_texture, v_uv + 3.0f * off * u_direction) * 0.09f;
    sum += texture(u_texture, v_uv + 4.0f * off * u_direction) * 0.05f;
    outColor = sum;
}
