#version 300 es
precision highp float;
layout (location = 0) in vec2 a_position; // input vertex position
layout (location = 1) in vec2 a_uv; // input texture coordinates

uniform mat3 u_matrix; // scale/rotate/translate matrix
uniform vec2 u_resolution; // width/height of the canvas

uniform vec2 u_sheetSize; // size of the texture sheet
uniform vec2 u_spriteIndex; // index of the sprite in the sheet

out vec2 v_uv;

void main() {
    // apply the matrix to the position
    vec2 position = (u_matrix * vec3(a_position, 1.0f)).xy;

    // convert the position from pixels to 0.0 to 1.0
    vec2 zeroToOne = position / u_resolution;

    // convert [0,1] to clip space [-1,1]
    vec2 clipSpace = zeroToOne * 2.0f - 1.0f;

    // flip Y
    gl_Position = vec4(clipSpace, 0.0f, 1.0f);

    // pass the texture coordinates to the fragment shader
  // compute the UV inside the sheet
    v_uv = (u_spriteIndex + a_uv) / u_sheetSize;
}