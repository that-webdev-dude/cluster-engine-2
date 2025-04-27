#version 300 es
precision mediump float;

in vec2 v_uv; // interpolated texture coordinates from vertex shader

uniform sampler2D u_texture; // texture
uniform float u_time; // time uniform for animation (seconds since start)

out vec4 outColor;

void main() {
    vec4 tex = texture(u_texture, v_uv);

    outColor = tex;
}