<script setup lang="ts">
const props = withDefaults(defineProps<{
  color?: [number, number, number]
  opacity?: number
}>(), {
  color: () => [0.13, 0.83, 0.71],
  opacity: 0.55,
})

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

// Threads converge on the left and fan out to the right, so the headline sits on calm space.
const fragmentSource = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
const int LINES = 36;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float spread = smoothstep(0.05, 1.0, uv.x);
  float t = uTime * 0.18;
  float alpha = 0.0;
  for (int i = 0; i < LINES; i++) {
    float f = float(i) / float(LINES - 1);
    float wave = sin(uv.x * 3.1 + t + f * 2.6) * 0.07
      + sin(uv.x * 6.7 - t * 1.4 + f * 4.3) * 0.03
      + sin(t * 0.6 + f * 6.2) * 0.04;
    float y = 0.34 + (f - 0.5) * 0.5 * spread + wave * spread;
    float distance = abs(uv.y - y) * uResolution.y;
    float width = mix(0.5, 1.25, spread);
    alpha += (1.0 - smoothstep(0.0, width, distance)) * mix(1.0, 0.3, f);
  }
  alpha = clamp(alpha, 0.0, 1.0) * smoothstep(0.0, 0.45, uv.x) * uOpacity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

onMounted(() => {
  const el = canvas.value
  const gl = el?.getContext('webgl', { antialias: true, premultipliedAlpha: true })
  if (!el || !gl) return

  const program = gl.createProgram()!
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const uResolution = gl.getUniformLocation(program, 'uResolution')
  const uTime = gl.getUniformLocation(program, 'uTime')
  gl.uniform3fv(gl.getUniformLocation(program, 'uColor'), props.color)
  gl.uniform1f(gl.getUniformLocation(program, 'uOpacity'), props.opacity)

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let visible = true
  const start = performance.now()

  function draw(now: number) {
    gl!.uniform1f(uTime, (now - start) / 1000)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }

  function loop(now: number) {
    draw(now)
    frame = visible && !reduceMotion.matches ? requestAnimationFrame(loop) : 0
  }

  function resume() {
    if (!frame && visible && !reduceMotion.matches) frame = requestAnimationFrame(loop)
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    el!.width = Math.round(el!.clientWidth * dpr)
    el!.height = Math.round(el!.clientHeight * dpr)
    gl!.viewport(0, 0, el!.width, el!.height)
    gl!.uniform2f(uResolution, el!.width, el!.height)
    draw(performance.now())
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(el)
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting)
    resume()
  })
  visibilityObserver.observe(el)
  reduceMotion.addEventListener('change', resume)
  resize()
  resume()

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    visibilityObserver.disconnect()
    reduceMotion.removeEventListener('change', resume)
  })
})
</script>

<template>
  <canvas
    ref="canvas"
    class="pointer-events-none block size-full"
    aria-hidden="true"
  />
</template>
