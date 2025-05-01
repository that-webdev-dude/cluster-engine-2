#version 300 es
layout (location = 0) in vec2 a_quadPos;
layout (location = 1) in vec2 a_position;
layout (location = 2) in vec2 a_scale;
layout (location = 3) in float a_rotation;
layout (location = 4) in vec4 a_color;

uniform vec2 u_resolution;

out vec4 v_color;

mat3 translation(vec2 t) {
    return mat3(1, 0, 0, 0, 1, 0, t.x, t.y, 1);
}
mat3 rotation(float ang) {
    float c = cos(ang), s = sin(ang);
    return mat3(c, -s, 0, s, c, 0, 0, 0, 1);
}
mat3 scale(vec2 s) {
    return mat3(s.x, 0, 0, 0, s.y, 0, 0, 0, 1);
}

void main() {
      // apply instance transforms to unit quad (0,0 -> 1,1)
    vec3 pos = translation(a_position) * rotation(a_rotation) * scale(a_scale) * vec3(a_quadPos, 1);

      // convert to clip space
    vec2 clip = ((pos.xy / u_resolution) * 2.0f - 1.0f) * vec2(1, -1);
    gl_Position = vec4(clip, 0, 1);
    v_color = a_color;
}