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
    // mat2 rotationMatrix = mat2(cosTheta, -sinTheta, sinTheta, cosTheta) * rot90;
    mat2 rotationMatrix = mat2(cosTheta, -sinTheta, sinTheta, cosTheta);

    // Step 1: center vertex around (0,0)
    vec2 centeredVertex = (a_vertex - vec2(0.5f, 0.5f)) * (a_scale * -1.0f); // scale is negative to ensure origin at top-left

    // Step 2: move vertex to pivot space
    vec2 pivotedVertex = centeredVertex - a_pivot;

    // Step 3: rotate around pivot
    vec2 rotatedVertex = rotationMatrix * pivotedVertex;

    // Step 4: move vertex back from pivot space
    vec2 finalVertex = rotatedVertex + a_pivot;

    // Step 5: position in world space (translation - camera offset)
    vec2 worldPosition = finalVertex + a_position - a_offset - uCamPos; // a_offset is an anchor shift

    // Apply projection
    gl_Position = uProj * vec4(worldPosition, 0.0f, 1.0f);

    // Pass color to fragment shader
    v_color = a_color;
}
