#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
out vec4 outColor;
void main() {
    vec4 c = texture(u_texture, v_uv);
    float lum = dot(c.rgb, vec3(0.299f, 0.587f, 0.114f));
    outColor = (lum > 0.8f) ? c : vec4(0.0f);
}
