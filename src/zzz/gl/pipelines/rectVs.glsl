#version 300 es
layout (location = 0) in vec2 aQuadPos;
layout (location = 1) in vec2 aInstancePos;
layout (location = 2) in vec2 aInstanceSize;
layout (location = 3) in vec4 aInstanceColor;

uniform mat4 uProj;

out vec4 vColor;

void main() {
    vec2 pos = aQuadPos * aInstanceSize + aInstancePos;
    gl_Position = uProj * vec4(pos, 0.0f, 1.0f);
    vColor = aInstanceColor;
}