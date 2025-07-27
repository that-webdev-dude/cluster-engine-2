#version 300 es
precision mediump float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_sampler;
out vec4 outColor;
void main() {
    outColor = texture(u_sampler, v_uv) * v_color;
}
