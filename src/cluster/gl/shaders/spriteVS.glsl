#version 300 es
layout (location = 0) in vec2 a_vertex;
layout (location = 1) in vec2 a_position;
layout (location = 2) in vec2 a_offset;
layout (location = 3) in vec2 a_scale;
layout (location = 4) in vec2 a_pivot;
layout (location = 5) in float a_angle;
layout (location = 6) in vec4 a_color;
layout (location = 7) in vec4 a_uvRect;
uniform mat4 uProj;
uniform vec2 uCamPos;
out vec2 v_uv;
out vec4 v_color;
void main() {
  // world‐space transform
    vec2 pos = a_vertex * a_scale;
    float s = sin(a_angle), c = cos(a_angle);
    pos = vec2(c * pos.x - s * pos.y, s * pos.x + c * pos.y);
    vec2 world = a_position + a_offset + (pos - a_pivot);
    gl_Position = uProj * vec4(world - uCamPos, 0, 1);

  // compute UV within [u0,v0]→[u1,v1]
    vec2 t = a_vertex + vec2(0.5f);
    v_uv = mix(a_uvRect.xy, a_uvRect.zw, t);
    v_color = a_color / 255.0f;
}
