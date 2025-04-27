#version 300 es
precision mediump float;
layout (location = 0) in vec2 a_position;
layout (location = 1) in vec2 a_uv;

out vec2 v_uv;

void main() {
    vec2 clipped_position = a_position * 2.0f - 1.0f;
    gl_Position = vec4(clipped_position, 0.0f, 1.0f);
    v_uv = a_uv;
}