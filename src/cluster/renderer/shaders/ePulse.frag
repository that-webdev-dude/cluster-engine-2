#version 300 es
precision mediump float;

in vec2 v_uv; // interpolated texture coordinates from vertex shader

uniform sampler2D u_texture; // texture
uniform float u_time; // time uniform for animation (seconds since start)

out vec4 outColor;

void main() {
    vec4 tex = texture(u_texture, v_uv);
    // Apply a simple animation effect based on time (pulsing in [0.5 ... 1.0] range)
    float pulse = 0.5f + 0.5f * sin(u_time * 2.0f); // Pulsing effect

    outColor = tex * pulse; // Apply the pulse effect to the texture color
}