#version 300 es
layout (location = 0) in vec2 a_vertex;
layout (location = 1) in vec2 a_translation;
layout (location = 2) in vec2 a_scale;
layout (location = 3) in vec4 a_color;

uniform mat4 uProj;
uniform vec2 uCamPos;

out vec4 v_color;

void main() {
    vec2 localPos = a_vertex * a_scale;

    vec2 view = localPos + a_translation - uCamPos;

    gl_Position = uProj * vec4(view, 0.0f, 1.0f);

    v_color = a_color;
}