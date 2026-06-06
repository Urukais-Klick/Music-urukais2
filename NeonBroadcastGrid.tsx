import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

#define PI 3.14159265359
#define S smoothstep

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float gridLine(float coord, float width, float time) {
  float w = width * 0.5;
  float p = abs(fract(coord) - 0.5);
  float fadeIn = S(0.0, 1.0, time);
  return (1.0 - S(w, w + 0.02, p)) * fadeIn * 0.5;
}

vec3 neonDot(vec2 uv, vec2 center, vec3 color, float time, float offset) {
  float t = time * 0.8 + offset;
  float pulse = sin(t) * 0.15 + sin(t * 1.3) * 0.1;
  float brightness = 0.8 + pulse;
  float d = length(uv - center);
  float core = exp(-d * d / (0.0008 * brightness));
  float glow = exp(-d * d / (0.008 * brightness)) * 0.6;
  float ring = exp(-pow(d - 0.02, 2.0) / 0.001) * 0.2 * brightness;
  return (core + glow * 0.5 + ring * 0.3) * color * brightness;
}

float undulateGrid(vec2 uv, float t) {
  float wave1 = sin(uv.x * 3.0 + t * 0.5) * cos(uv.y * 2.5 + t * 0.4);
  float wave2 = sin(uv.x * 5.0 - t * 0.7) * sin(uv.y * 4.0 + t * 0.6);
  return wave1 * 0.15 + wave2 * 0.1;
}

float lensBulge(vec2 uv, vec2 mouse) {
  float d = length(uv - mouse);
  return smoothstep(0.8, 0.0, d) * 0.4;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;
  
  float t = u_time;
  vec2 origin = vec2(sin(t * 0.15) * 0.2, cos(t * 0.12) * 0.15);
  
  vec2 mouse = (u_mouse / u_resolution) * 2.0 - 1.0;
  mouse.x *= u_resolution.x / u_resolution.y;
  
  float bulge = lensBulge(p, mouse);
  
  vec2 perspUV = p - origin;
  float dist = length(perspUV);
  float zDepth = 3.0 / (dist + 0.5) - bulge;
  perspUV *= zDepth * 0.3;
  float undulation = undulateGrid(perspUV, t) + bulge;
  perspUV += undulation;
  
  vec3 gridColor = vec3(0.0);
  gridColor += vec3(0.0, 0.94, 1.0) * gridLine(perspUV.x + undulation, 0.3, t);
  gridColor += vec3(1.0, 0.0, 1.0) * gridLine(perspUV.y + undulation, 0.3, t);
  
  float mask = S(2.0, 0.5, dist - bulge * 0.5);
  gridColor *= mask;
  
  vec3 dots = vec3(0.0);
  vec2 fi = floor(perspUV * 8.0);
  
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 nc = fi + vec2(float(dx), float(dy));
      float hashVal = hash(nc);
      vec2 dotPos = (nc + 0.5) / 8.0;
      float pd = length(p - dotPos);
      if (hashVal > 0.85) {
        vec3 dc;
        if (mod(hashVal * 10.0, 2.0) > 1.0) {
          dc = vec3(0.0, 0.94, 1.0);
        } else {
          dc = vec3(1.0, 0.0, 1.0);
        }
        dots += neonDot(p, dotPos, dc, t, hashVal * 6.28) * exp(-pd * pd * 2.0);
      }
    }
  }
  
  gridColor += dots * mask;
  
  float vig = 1.0 - dot(p, p) * 0.3;
  gl_FragColor = vec4(gridColor * max(vig, 0.0), 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram | null {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;
  
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  
  return program;
}

export default function NeonBroadcastGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false });
    if (!gl) return;

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) return;

    const vertices = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_mouse: gl.getUniformLocation(program, 'u_mouse'),
    };

    const uniformValues = {
      u_time: 0.0,
      u_resolution: [canvas.width, canvas.height] as [number, number],
      u_mouse: [canvas.width / 2, canvas.height / 2] as [number, number],
    };

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + 'px';
      canvas!.style.height = window.innerHeight + 'px';
      uniformValues.u_resolution = [canvas!.width, canvas!.height];
    }

    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const dpr = window.devicePixelRatio || 1;
      uniformValues.u_mouse[0] = e.clientX * dpr;
      uniformValues.u_mouse[1] = (window.innerHeight - e.clientY) * dpr;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', resize);

    let animId: number;

    function render() {
      resize();
      uniformValues.u_time += 0.016;

      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.useProgram(program);

      gl!.uniform1f(uniforms.u_time, uniformValues.u_time);
      gl!.uniform2f(uniforms.u_resolution, uniformValues.u_resolution[0], uniformValues.u_resolution[1]);
      gl!.uniform2f(uniforms.u_mouse, uniformValues.u_mouse[0], uniformValues.u_mouse[1]);

      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
