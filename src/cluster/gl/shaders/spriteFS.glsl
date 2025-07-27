#version 300 es
precision mediump float;
out vec4 outColor;
void main() {
    outColor = vec4(1, 0, 0, 1);
}

// #version 300 es
// precision mediump float;

// in vec4 v_color;
// in vec2 v_uv;

// uniform sampler2D uTexture;

// out vec4 outColor;

// void main() {
//     vec4 tex = texture(uTexture, v_uv);
//     // outColor = tex * v_color;
//     outColor = vec4(1, 0, 0, 1);
// }