#version 300 es

layout (location = 0) in vec2 a_vertex;   // unit quad in [–0.5,0.5]
layout (location = 1) in vec2 a_position; // world px
layout (location = 2) in vec2 a_offset;   // px
layout (location = 3) in vec2 a_scale;    // [width, height] px
layout (location = 4) in vec2 a_pivot;    // px
layout (location = 5) in float a_angle;   // radians
layout (location = 6) in vec4 a_color;    // 0–255
layout (location = 7) in vec4 a_uvRect;   // [u0,v0,u1,v1]

uniform mat4 uProj;
uniform vec2 uCamPos;

out vec2 v_uv;
out vec4 v_color;

void main() {
  // 1) scale unit-quad into px
    vec2 scaled = a_vertex * a_scale;

  // 2) rotate around pivot (all in px)
    float c = cos(a_angle);

    float s = sin(a_angle);

    mat2 rot = mat2(c, -s, s, c);

    vec2 rotated = rot * (scaled - a_pivot) + a_pivot;

  // 3) translate by offset+position, then subtract camera
    vec2 world = a_position + a_offset + rotated - uCamPos;

    gl_Position = uProj * vec4(world, 0.0f, 1.0f);

  // UV interpolation & color tint
    vec2 t = a_vertex + vec2(0.5f);

    v_uv = mix(a_uvRect.xy, a_uvRect.zw, t);

    v_color = a_color / 255.0f;
}

// void main() {
//   // world‐space transform
//     vec2 pos = a_vertex * a_scale;
//     float s = sin(a_angle), c = cos(a_angle);
//     pos = vec2(c * pos.x - s * pos.y, s * pos.x + c * pos.y);
//     vec2 world = a_position + a_offset + (pos - a_pivot);
//     gl_Position = uProj * vec4(world - uCamPos, 0, 1);

//   // compute UV within [u0,v0]→[u1,v1]
//     vec2 t = a_vertex + vec2(0.5f);
//     v_uv = mix(a_uvRect.xy, a_uvRect.zw, t);
//     v_color = a_color / 255.0f;
// }
