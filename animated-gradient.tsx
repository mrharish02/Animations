import React, { useRef, useEffect } from "react";

const vertexShaderSource = `#version 300 es
precision mediump float;
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;

#define NUM_COLORS 20
#define PI 3.14159265359

vec3 cyberpunkColors[NUM_COLORS] = vec3[](
  vec3(0.01, 0.01, 0.02),
  vec3(0.02, 0.02, 0.05),
  vec3(0.03, 0.02, 0.08),
  vec3(0.05, 0.0, 0.12),
  vec3(0.1, 0.0, 0.2),
  vec3(0.2, 0.0, 0.3),
  vec3(0.3, 0.0, 0.5),
  vec3(0.5, 0.0, 0.8),
  vec3(0.7, 0.0, 1.0),
  vec3(0.9, 0.0, 0.9),
  vec3(1.0, 0.0, 0.7),
  vec3(1.0, 0.0, 0.5),
  vec3(1.0, 0.0, 0.3),
  vec3(1.0, 0.1, 0.1),
  vec3(1.0, 0.3, 0.0),
  vec3(1.0, 0.5, 0.0),
  vec3(0.7, 1.0, 0.0),
  vec3(0.0, 1.0, 0.5),
  vec3(0.0, 1.0, 0.8),
  vec3(0.0, 0.8, 1.0)
);

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float noise2D(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);

  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.792843 - 0.853734 * (a0 * a0 + h * h);

  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;

  return 130.0 * dot(m, g);
}

float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 8; i++) {
    value += amplitude * noise2D(st * freq);
    freq *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);

  float md = 5.0;
  vec2 mr;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(i, j);
      vec2 o = 0.5 + 0.5 * sin(uTime * 0.1 + 6.2831 * vec2(noise2D(n + g + vec2(0.0, 0.0)), noise2D(n + g + vec2(1.0, 1.0))));
      vec2 r = g + o - f;
      float d = dot(r, r);

      if (d < md) {
        md = d;
        mr = r;
      }
    }
  }
  return md;
}

float circuitPattern(vec2 uv, float time, float scale) {
  vec2 scaledUV = uv * scale;

  vec2 cell = floor(scaledUV);
  vec2 cellUV = fract(scaledUV);

  float cellRandom = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);

  float lineWidth = 0.05;
  float horizontalLine = smoothstep(0.0, lineWidth, abs(cellUV.y - 0.5));
  float verticalLine = smoothstep(0.0, lineWidth, abs(cellUV.x - 0.5));

  horizontalLine = mix(1.0, horizontalLine, step(0.4, cellRandom));
  verticalLine = mix(1.0, verticalLine, step(0.7, cellRandom));

  float nodeSize = 0.15;
  float node = 0.0;

  if (cellRandom > 0.75) {
    float dist = length(cellUV - 0.5);
    node = smoothstep(nodeSize, nodeSize - 0.05, dist);
  }

  float component = 0.0;
  if (cellRandom > 0.9) {
    vec2 compUV = abs(cellUV - 0.5);
    float compSize = 0.2 + 0.1 * sin(time + cellRandom * 10.0);
    component = step(compSize, max(compUV.x, compUV.y));
  }

  float led = 0.0;
  if (cellRandom > 0.95) {
    float ledSize = 0.05;
    float dist = length(cellUV - vec2(0.7, 0.3));
    led = smoothstep(ledSize, ledSize - 0.02, dist);
    led *= 0.5 + 0.5 * sin(time * (3.0 + cellRandom * 5.0));
  }

  float circuit = min(horizontalLine * verticalLine, 1.0);
  circuit = min(circuit + node + component, 1.0);
  circuit = min(circuit + led * 2.0, 1.0);

  float pulseSpeed = 0.2;
  float pulse = 0.05 * sin(time * pulseSpeed + cellRandom * 10.0);

  return circuit + pulse;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  vec2 originalUV = uv;
  uv *= 0.25;

  float t = uTime * 0.2;

  float waveAmp = 0.3 + 0.2 * noise2D(vec2(t * 0.5, 27.7));

  float waveX = waveAmp * sin(uv.y * 3.5 + t);
  float waveY = waveAmp * sin(uv.x * 3.5 - t);
  uv.x += waveX;
  uv.y += waveY;

  float r = length(uv);
  float angle = atan(uv.y, uv.x);
  float swirlStrength = 1.5 * (1.0 - smoothstep(0.0, 1.0, r));

  angle += swirlStrength * sin(uTime * 0.8 + r * 4.0);
  uv = vec2(cos(angle), sin(angle)) * r;

  float n = fbm(uv);
  float v = voronoi(uv * 3.0 + t * 0.2);
  n = mix(n, v, 0.3);

  float swirlEffect = 0.25 * sin(t + n * 3.0);
  n += swirlEffect;

  float noiseVal = 0.5 * (n + 1.0);

  float idx = clamp(noiseVal, 0.0, 1.0) * float(NUM_COLORS - 1);
  int iLow = int(floor(idx));
  int iHigh = int(min(float(iLow + 1), float(NUM_COLORS - 1)));
  float f = fract(idx);

  vec3 colLow = cyberpunkColors[iLow];
  vec3 colHigh = cyberpunkColors[iHigh];
  vec3 color = mix(colLow, colHigh, f);

  float glow = 0.5 * (1.0 - length(uv));
  color += vec3(0.0, 0.2, 0.5) * max(0.0, glow * glow);

  float circuit = circuitPattern(originalUV, t, 20.0);

  vec3 circuitColor = vec3(0.0, 0.5, 1.0);
  float circuitVisibility = 0.15 * (1.0 - smoothstep(0.0, 0.5, length(color)));
  color = mix(color, color + circuitColor * circuit, circuitVisibility);

  float pulse = 0.1 * sin(t * 2.0);
  color *= 1.0 + pulse * max(0.0, length(color) - 0.5);

  if (iLow == 0 && iHigh == 0 && circuit < 0.1) {
    outColor = vec4(color, 0.0);
  } else {
    outColor = vec4(color, 1.0);
  }
}
`;

function AnimatedGradientBackground ({ style, className }: {
  style?: React.CSSProperties;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas:HTMLCanvasElement = canvasRef.current!;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: true })!;
    if (!gl) {
      console.error("WebGL2 is not supported by your browser.");
      return;
    }

    // Resize handling
    function resize() {
      canvas.width = canvas?.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    // Shader compiler
    function compileShader(type:any, source:any) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader!, source);
      gl.compileShader(shader!);
      if (!gl.getShaderParameter(shader!, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader!));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Setup vertex data
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const resLoc = gl.getUniformLocation(program, "uResolution");
    const timeLoc = gl.getUniformLocation(program, "uTime");

    let startTime = performance.now();

    function render() {
      const now = performance.now();
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, (now - startTime) * 0.001);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId.current = requestAnimationFrame(render);
    }
    render();

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
    };
  }, []);

  // Styles to make canvas fill container and not interfere with content
  const combinedStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: -1,
    ...style,
  };

  return <canvas ref={canvasRef} className={className} style={combinedStyle} />;
}

export default AnimatedGradientBackground;
