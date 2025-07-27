#version 300 es
precision mediump float;

// we only need the position attribute
layout (location = 0) in vec2 a_vertex;

void main() {
  // a_vertex runs from (0,0),(1,0),(0,1),(0,1),(1,0),(1,1)
  // map that to NDC: (0→-1, 1→+1)
    vec2 pos = a_vertex * 2.0f - 1.0f;
    gl_Position = vec4(pos, 0, 1);
}

// #version 300 es
// precision mediump float;

// // 1) match the pipeline order exactly:
// layout (location = 0) in vec2 a_vertex;
// layout (location = 1) in vec2 a_translation;
// layout (location = 2) in vec2 a_scale;
// layout (location = 3) in float a_rotation;
// layout (location = 4) in vec2 a_pivot;
// layout (location = 5) in vec4 a_uv;
// layout (location = 6) in vec4 a_color;

// uniform mat4 uProj;
// uniform vec2 uCamPos;

// out vec4 v_color;
// out vec2 v_uv;

// void main() {
//     // rotation around center
//     float c = cos(a_rotation);
//     float s = sin(a_rotation);
//     mat2 rot = mat2(c, -s, s, c);

//     // center, apply scale & pivot
//     vec2 centered = (a_vertex - 0.5f) * a_scale;
//     vec2 p = centered - a_pivot;
//     vec2 r = rot * p + a_pivot;

//     // world‐space
//     vec2 worldPos = r + a_translation - uCamPos;
//     gl_Position = uProj * vec4(worldPos, 0, 1);

//     // interpolate UVs
//     vec2 uv0 = a_uv.xy;
//     vec2 uv1 = a_uv.zw;
//     v_uv = uv0 + a_vertex * (uv1 - uv0);

//     v_color = a_color / 255.0f;  // if you stored 0–255 you can also let GL normalize
// }
