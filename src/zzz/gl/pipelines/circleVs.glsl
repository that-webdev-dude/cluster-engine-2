#version 300 es
precision mediump float;

// Base‐mesh vertex around unit circle (vec2)
// per‐instance: translation, radius, color
layout (location = 0) in vec2 a_vertex;
layout (location = 1) in vec2 a_translation;
layout (location = 2) in float a_radius;
layout (location = 3) in vec4 a_color;

// Uniforms from your pipeline
uniform mat4 uProj;
uniform vec2 uCamPos;

// Passed to fragment shader
out vec4 v_color;
out vec2 v_local; // local-space vertex for distance test

void main() {
    // 1) scale unit‐circle vertex by radius
    vec2 localPos = a_vertex * a_radius;

    // 2) move into world‐space, subtract camera
    vec2 worldPos = localPos + a_translation - uCamPos;

    // 3) project to clip‐space
    gl_Position = uProj * vec4(worldPos, 0.0f, 1.0f);

    // 4) forward color & local‐pos
    v_color = a_color;
    v_local = a_vertex;
}
