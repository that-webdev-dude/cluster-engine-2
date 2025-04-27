#version 300 es
precision highp float;

layout (location = 0) in vec2 a_position;  // already clip-space coords
layout (location = 1) in vec2 a_uv;

out vec2 v_uv;

void main() {
    gl_Position = vec4(a_position, 0.0f, 1.0f);
    v_uv = a_uv;
}
