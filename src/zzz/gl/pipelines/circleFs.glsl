#version 300 es
precision mediump float;

in vec4 v_color;
in vec2 v_local;

out vec4 outColor;

void main() {
    // Discard fragments outside the unit radius
    if (length(v_local) > 1.0f) {
        discard;
    }
    outColor = v_color;
}
