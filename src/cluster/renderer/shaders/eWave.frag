#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_texture;
uniform float u_time;
out vec4 outColor;

void main() {
    float freq = 10.0f;
    float amp = 0.02f;
    vec2 uv = v_uv;
    uv.y += sin(uv.x * freq + u_time) * amp;
    uv.x += cos(uv.y * freq + u_time) * amp;
    outColor = texture(u_texture, uv);
}