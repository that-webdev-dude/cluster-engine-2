#version 300 es
layout (location = 0) in vec2 a_vertex;
layout (location = 1) in vec2 a_position;
layout (location = 2) in vec2 a_offset;
layout (location = 3) in vec2 a_scale;
layout (location = 4) in vec4 a_color;
layout (location = 5) in vec2 a_pivot;
layout (location = 6) in float a_angle;

uniform mat4 uProj;
uniform vec2 uCamPos;

out vec4 v_color;

void main() {
    float cosTheta = cos(a_angle);
    float sinTheta = sin(a_angle);

    // Construct rotation matrix
    mat2 rotationMatrix = mat2(cosTheta, -sinTheta, sinTheta, cosTheta);

    // Local position relative to anchor
    vec2 local = a_vertex - a_offset;

    // Apply pivoted rotation
    vec2 rotated = rotationMatrix * (local - a_pivot) + a_pivot;

    // Apply scaling
    vec2 scaled = rotated * a_scale;

    // Final world position
    vec2 worldPos = a_position + scaled - uCamPos;

    gl_Position = uProj * vec4(worldPos, 0.0f, 1.0f);

    // Pass color to fragment shader
    v_color = a_color;
}
