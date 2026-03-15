
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (!gl) alert('WebGL не поддерживается');

//  шейдеры

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    varying lowp vec4 vColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

const fsSource = `
    precision mediump float;
    varying lowp vec4 vColor;
    uniform vec4 uColorMult;
    void main(void) {
        gl_FragColor = vColor * uColorMult;
    }
`;

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Ошибка компиляции шейдера:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Ошибка линковки программы:', gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const program = createProgram(
    compileShader(gl.VERTEX_SHADER, vsSource),
    compileShader(gl.FRAGMENT_SHADER, fsSource)
);

const attribs = {
    position: gl.getAttribLocation(program, 'aVertexPosition'),
    color:    gl.getAttribLocation(program, 'aVertexColor'),
};

const uniforms = {
    projection: gl.getUniformLocation(program, 'uProjectionMatrix'),
    modelView:  gl.getUniformLocation(program, 'uModelViewMatrix'),
    colorMult:  gl.getUniformLocation(program, 'uColorMult'),
};

//  геометрия куба 

function createCubeBuffers() {
    const positions = [
        -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,  // front
        -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,  // back
        -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,  // top
        -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,  // bottom
         1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,  // right
        -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1,  // left
    ];

    // разные оттенки серого чтобы грани куба различались
    const faceShades = [1.0, 0.8, 0.95, 0.6, 0.9, 0.7];
    const colors = faceShades.flatMap(s => Array(4).fill([s, s, s, 1.0]).flat());

    const indices = [];
    for (let i = 0; i < 6; i++) {
        const base = i * 4;
        indices.push(base, base+1, base+2, base, base+2, base+3);
    }

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const colBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return { pos: posBuf, col: colBuf, idx: idxBuf };
}

const cubeBuffers = createCubeBuffers();

//  рендер

function bindAttrib(buffer, location, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

const projection = mat4.create();

function drawCube(offset, color) {
    const mv = mat4.create();
    mat4.translate(mv, mv, offset);
    mat4.rotateX(mv, mv, 0.5);
    mat4.rotateY(mv, mv, 0.5);

    bindAttrib(cubeBuffers.pos, attribs.position, 3);
    bindAttrib(cubeBuffers.col, attribs.color, 4);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeBuffers.idx);
    gl.useProgram(program);

    gl.uniformMatrix4fv(uniforms.projection, false, projection);
    gl.uniformMatrix4fv(uniforms.modelView, false, mv);
    gl.uniform4fv(uniforms.colorMult, color);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function render() {
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    mat4.perspective(
        projection,
        45 * Math.PI / 180,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100.0
    );

    drawCube([cur.x1, 0, -7], [cur.r, cur.g, cur.b, 1]);
    drawCube([cur.x2, 0, -7], [cur.r, cur.g, cur.b, 1]);
}

//  анимация 

// текущие значения и цель для lerp
const cur = { x1: -2, x2: 2, r: 0.34, g: 0.93, b: 0.32 };
let target = { ...cur };

function lerp(a, b) { return a + (b - a) * 0.1; }

function tick() {
    cur.x1 = lerp(cur.x1, target.x1);
    cur.x2 = lerp(cur.x2, target.x2);
    cur.r  = lerp(cur.r,  target.r);
    cur.g  = lerp(cur.g,  target.g);
    cur.b  = lerp(cur.b,  target.b);

    render();
    requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

//  toggle 

const svgCircle = document.querySelector('#svg-object circle');
let toggled = false;

document.getElementById('toggle-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggled = !toggled;

    if (toggled) {
        target = { x1: -0.7, x2: 0.7, r: 0.93, g: 0.2, b: 0.2 };
        svgCircle.setAttribute('fill', '#ed3434');
    } else {
        target = { x1: -2, x2: 2, r: 0.34, g: 0.93, b: 0.32 };
        svgCircle.setAttribute('fill', '#58ed53');
    }
});