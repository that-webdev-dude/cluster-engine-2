#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene, u_bloom;
out vec4 outColor;
void main() {
    vec4 scene = texture(u_scene, v_uv);
    vec4 glow = texture(u_bloom, v_uv);
    outColor = scene + glow * 1.2f;  // tweak intensity
}
