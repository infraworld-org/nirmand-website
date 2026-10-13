/* Nirmand hero: 3D phone ring in raw WebGL (no library). 10 Oct 2026.
   Seven phones with real app screens turn in a ring. Intro: one phone with the logo splash,
   slow zoom out, then it turns to the right and the other six appear behind it one by one.
   Falls back to the CSS ring (already in the page) when WebGL is not available. */
(function () {
  'use strict';
  var stage = document.getElementById('ringStage'), cssRing = document.getElementById('ring');
  if (!stage || !cssRing) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas'); canvas.className = 'ring-gl'; canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return;
  stage.insertBefore(canvas, stage.firstChild); stage.classList.add('gl');
  var aniso = gl.getExtension('EXT_texture_filter_anisotropic');

  /* ---------------- shaders ---------------- */
  var VS = [
    'attribute vec3 aP; attribute vec3 aN; attribute vec2 aUv;',
    'uniform mat4 uM, uV, uP; uniform mat3 uNm;',
    'varying vec3 vP, vN; varying vec2 vUv;',
    'void main(){ vec4 w = uM * vec4(aP,1.0); vP = w.xyz; vN = normalize(uNm * aN); vUv = aUv; gl_Position = uP * uV * w; }'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'varying vec3 vP, vN; varying vec2 vUv;',
    'uniform vec3 uCam, uColor; uniform float uMetal, uRough, uAlpha, uMode, uMix, uDim, uRailMetal, uRailRough;',
    'uniform sampler2D uTex, uTex2;',
    'vec3 env(vec3 r){',            // studio-like environment: bright top, two soft light bands, dark floor
    '  float up = r.y;',
    '  vec3 sky = mix(vec3(0.16,0.22,0.38), vec3(0.78,0.84,0.98), smoothstep(-0.2,0.9,up));',
    '  vec3 floorc = vec3(0.05,0.08,0.16);',
    '  vec3 c = mix(floorc, sky, smoothstep(-0.6,0.1,up));',
    '  float a = atan(r.x, r.z);',
    '  float band = smoothstep(0.88,1.0,cos(a-0.9)) + 0.75*smoothstep(0.86,1.0,cos(a+2.2)) + 0.5*smoothstep(0.94,1.0,cos(a-2.6));',
    '  c += vec3(0.92,0.94,1.0) * band * smoothstep(-0.4,0.5,up) * 1.25;',
    '  return c; }',
    'void main(){',
    '  vec3 N = normalize(vN); vec3 V = normalize(uCam - vP);',
    '  float nv = max(dot(N,V),0.0);',
    '  if(uMode > 0.5){',             // screen: unlit texture (+ crossfade) + faint glass glare
    '    vec4 t = mix(texture2D(uTex, vUv), texture2D(uTex2, vUv), uMix);',
    '    float gl1 = pow(1.0-nv, 3.0)*0.10;',
    '    gl_FragColor = vec4(t.rgb*uDim + gl1, uAlpha * t.a); return; }',
    '  vec3 L1 = normalize(vec3(-0.35,0.85,0.55)); vec3 L2 = normalize(vec3(0.8,0.2,-0.4));',
    '  float rail = vUv.x < -0.5 ? 1.0 : 0.0;',
    '  float metal = mix(uMetal, uRailMetal, rail), rough = mix(uRough, uRailRough, rail);',
    '  vec3 base = mix(uColor, uColor*1.35 + 0.08, rail);',
    '  vec3 diff = base*(1.0-metal)*(0.28 + 0.62*max(dot(N,L1),0.0) + 0.22*max(dot(N,L2),0.0));',
    '  vec3 R = reflect(-V,N); vec3 e = env(R);',
    '  vec3 F0 = mix(vec3(0.04), base, metal);',
    '  vec3 F = F0 + (1.0-F0)*pow(1.0-nv,5.0);',
    '  vec3 H = normalize(L1+V); float sh = mix(260.0, 8.0, rough);',
    '  float sp = pow(max(dot(N,H),0.0), sh) * (1.0-rough*0.5);',
    '  vec3 spec = e*F*(1.0-rough*0.55) + vec3(1.0)*sp*(0.6+0.5*rail);',
    '  vec3 c = (diff + spec) * uDim;',
    '  gl_FragColor = vec4(c, uAlpha); }'
  ].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  var A = { P: gl.getAttribLocation(prog, 'aP'), N: gl.getAttribLocation(prog, 'aN'), Uv: gl.getAttribLocation(prog, 'aUv') };
  var U = {}; ['uM', 'uV', 'uP', 'uNm', 'uCam', 'uColor', 'uMetal', 'uRough', 'uAlpha', 'uMode', 'uMix', 'uDim', 'uTex', 'uTex2', 'uRailMetal', 'uRailRough'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  /* ---------------- small matrix lib ---------------- */
  function m4() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function mul(a, b) { var o = new Float32Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function tr(x, y, z) { var m = m4(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function sc(x, y, z) { var m = m4(); m[0] = x; m[5] = y; m[10] = z; return m; }
  function rotY(a) { var m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  function rotX(a) { var m = m4(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  function rotZ(a) { var m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  function persp(fov, asp, n, f) { var m = new Float32Array(16), t = 1 / Math.tan(fov / 2); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; }
  function lookAt(e, c, up) { var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]); }
  function normalMat(m) { // upper 3x3 of model (rotations + uniform scale only here)
    var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    var det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g); var k = 1 / det;
    return new Float32Array([(e * i - f * h) * k, (c * h - b * i) * k, (b * f - c * e) * k, (f * g - d * i) * k, (a * i - c * g) * k, (c * d - a * f) * k, (d * h - e * g) * k, (b * g - a * h) * k, (a * e - b * d) * k]); }

  /* ---------------- geometry: rounded slab with filleted rail ---------------- */
  function outline(hw, hh, r, n) { // rounded-rect outline, CCW, with outward normals
    var pts = [], per = Math.max(4, n), cs = [[hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2], [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), 3 * Math.PI / 2]];
    for (var c = 0; c < 4; c++) for (var k = 0; k <= per; k++) { var a = cs[c][2] + (k / per) * Math.PI / 2; pts.push({ x: cs[c][0] + r * Math.cos(a), y: cs[c][1] + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) }); }
    return pts;
  }
  function slab(hw, hh, r, t, f, segs, uvFront) { // returns {pos, nrm, uv, idx}
    var o = outline(hw, hh, r, segs), P = [], Nn = [], Uv = [], I = [], M = 10, rows = [];
    // rail cross-section: from front edge (inset f) around to back edge
    for (var j = 0; j <= M; j++) { var phi = (j / M) * Math.PI; // 0 -> front, PI -> back
      var off = -f + f * Math.sin(phi);
      rows.push({ off: off, z: (t / 2 - f) * (phi <= Math.PI / 2 ? 1 : -1) + f * Math.cos(phi), nz: Math.cos(phi), nr: Math.sin(phi) }); }
    var ring = o.length;
    rows.forEach(function (rw) { o.forEach(function (p) { P.push(p.x + p.nx * rw.off, p.y + p.ny * rw.off, rw.z); Nn.push(p.nx * rw.nr, p.ny * rw.nr, rw.nz); Uv.push(-1, -1); }); });
    for (var j = 0; j < M; j++) for (var i = 0; i < ring; i++) { var i2 = (i + 1) % ring, a = j * ring + i, b = j * ring + i2, c = (j + 1) * ring + i, d = (j + 1) * ring + i2; I.push(a, c, b, b, c, d); }
    // front + back caps (fan)
    function cap(z, nz, inset, uvOn) { var base = P.length / 3; P.push(0, 0, z); Nn.push(0, 0, nz); Uv.push(0.5, 0.5);
      o.forEach(function (p) { var x = p.x + p.nx * -inset, y = p.y + p.ny * -inset; P.push(x, y, z); Nn.push(0, 0, nz); Uv.push(uvOn ? (x / (2 * (hw - inset)) + 0.5) : 0, uvOn ? (0.5 - y / (2 * (hh - inset))) : 0); });
      for (var i = 0; i < ring; i++) { var i2 = (i + 1) % ring; if (nz > 0) I.push(base, base + 1 + i, base + 1 + i2); else I.push(base, base + 1 + i2, base + 1 + i); } }
    cap(t / 2, 1, f, uvFront); cap(-t / 2, -1, f, false);
    return { pos: new Float32Array(P), nrm: new Float32Array(Nn), uv: new Float32Array(Uv), idx: new Uint16Array(I) };
  }
  function plate(hw, hh, r, segs) { // flat rounded rect with uv, normal +z
    var o = outline(hw, hh, r, segs), P = [0, 0, 0], Nn = [0, 0, 1], Uv = [0.5, 0.5], I = [];
    o.forEach(function (p) { P.push(p.x, p.y, 0); Nn.push(0, 0, 1); Uv.push(p.x / (2 * hw) + 0.5, 0.5 - p.y / (2 * hh)); });
    for (var i = 0; i < o.length; i++) I.push(0, 1 + i, 1 + (i + 1) % o.length);
    return { pos: new Float32Array(P), nrm: new Float32Array(Nn), uv: new Float32Array(Uv), idx: new Uint16Array(I) };
  }
  function cylinder(rad, h, n, capRadiusInner) { // along +z, z in [0,h], outward normals + top cap
    var P = [], Nn = [], Uv = [], I = [];
    for (var i = 0; i <= n; i++) { var a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); P.push(rad * c, rad * s, 0, rad * c, rad * s, h); Nn.push(c, s, 0, c, s, 0); Uv.push(0, 0, 0, 0); }
    for (var i = 0; i < n; i++) { var a = i * 2, b = a + 1, c2 = a + 2, d = a + 3; I.push(a, c2, b, b, c2, d); }
    var base = P.length / 3; P.push(0, 0, h); Nn.push(0, 0, 1); Uv.push(0.5, 0.5);
    for (var i = 0; i <= n; i++) { var a = i / n * Math.PI * 2; P.push(rad * Math.cos(a), rad * Math.sin(a), h); Nn.push(0, 0, 1); Uv.push(0, 0); }
    for (var i = 0; i < n; i++) I.push(base, base + 1 + i, base + 2 + i);
    return { pos: new Float32Array(P), nrm: new Float32Array(Nn), uv: new Float32Array(Uv), idx: new Uint16Array(I) };
  }
  function upload(g) { var o = { n: g.idx.length }; o.p = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o.p); gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW);
    o.nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o.nb); gl.bufferData(gl.ARRAY_BUFFER, g.nrm, gl.STATIC_DRAW);
    o.u = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o.u); gl.bufferData(gl.ARRAY_BUFFER, g.uv, gl.STATIC_DRAW);
    o.i = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW); return o; }
  function draw(mesh, M, mat) {
    gl.uniformMatrix4fv(U.uM, false, M); gl.uniformMatrix3fv(U.uNm, false, normalMat(M));
    gl.uniform3fv(U.uColor, mat.color || [0.5, 0.5, 0.5]); gl.uniform1f(U.uMetal, mat.metal || 0); gl.uniform1f(U.uRough, mat.rough === undefined ? 0.5 : mat.rough);
    gl.uniform1f(U.uAlpha, mat.alpha === undefined ? 1 : mat.alpha); gl.uniform1f(U.uRailMetal, mat.railMetal === undefined ? (mat.metal || 0) : mat.railMetal); gl.uniform1f(U.uRailRough, mat.railRough === undefined ? (mat.rough === undefined ? 0.5 : mat.rough) : mat.railRough); gl.uniform1f(U.uMode, mat.tex ? 1 : 0); gl.uniform1f(U.uMix, mat.mix || 0); gl.uniform1f(U.uDim, mat.dim === undefined ? 1 : mat.dim);
    if (mat.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mat.tex); gl.uniform1i(U.uTex, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mat.tex2 || mat.tex); gl.uniform1i(U.uTex2, 1); }
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.p); gl.enableVertexAttribArray(A.P); gl.vertexAttribPointer(A.P, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb); gl.enableVertexAttribArray(A.N); gl.vertexAttribPointer(A.N, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.u); gl.enableVertexAttribArray(A.Uv); gl.vertexAttribPointer(A.Uv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.i); gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_SHORT, 0);
  }

  /* ---------------- phone model (units: phone width = 1) ---------------- */
  var W = 1, H = 2.16, T = 0.112, R = 0.17, F = T * 0.28, BEZ = 0.026, SB = 0.06; // SB: status-bar band as a fraction of screen height
  var body = upload(slab(W / 2, H / 2, R, T, F, 10, false));
  var screen = upload(plate(W / 2 - BEZ, H / 2 - BEZ, R - BEZ, 10));
  var island = upload(plate(0.105, 0.021, 0.021, 6));
  var plateau = upload(slab(0.235, 0.235, 0.075, 0.05, 0.012, 6, false));
  var lensRing = upload(cylinder(0.088, 0.03, 40));
  var lensGlass = upload(cylinder(0.07, 0.034, 40));
  var lensInner = upload(cylinder(0.045, 0.036, 32));
  var flash = upload(cylinder(0.03, 0.006, 24));
  var btnL = upload(slab(0.028, 0.085, 0.013, 0.012, 0.004, 5, false)); // volume (y long): sits in the rail, barely proud
  var btnP = upload(slab(0.028, 0.14, 0.013, 0.012, 0.004, 5, false));  // power
  var btnA = upload(slab(0.024, 0.05, 0.012, 0.012, 0.004, 5, false));  // action
  var grvL = upload(slab(0.036, 0.095, 0.018, 0.02, 0.004, 5, false)), grvP = upload(slab(0.036, 0.15, 0.018, 0.02, 0.004, 5, false)), grvA = upload(slab(0.032, 0.06, 0.016, 0.02, 0.004, 5, false));
  var shadowQ = upload(plate(1, 1, 0.5, 8));
  var NAVY = [0.15, 0.23, 0.45], RAIL = [0.40, 0.48, 0.70];

  /* ---------------- textures ---------------- */
  var SW = W - 2 * BEZ, SH = H - 2 * BEZ, SCREEN_ASPECT = SW / SH;
  var LW = 1024, LH = Math.round(LW / SCREEN_ASPECT), SBH = Math.round(LH * SB);   // layout canvas at the screen's own aspect
  function statusBar(x, color) {                                                       // 9:41 + signal, wifi, battery (white)
    x.fillStyle = color; x.fillRect(0, 0, LW, SBH);
    var cy = SBH * 0.56, white = '#FFFFFF';
    x.fillStyle = white; x.font = '600 ' + Math.round(SBH * 0.40) + 'px -apple-system, "SF Pro Text", "Segoe UI", Roboto, Inter, system-ui, sans-serif';
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText('9:41', LW * 0.085, cy);
    var u = SBH * 0.26;                                   // icon unit
    // signal: 4 bars
    var sx = LW * 0.715; for (var i = 0; i < 4; i++) { var bh = u * (0.45 + 0.18 * i); rr(x, sx + i * u * 0.33, cy + u * 0.38 - bh, u * 0.24, bh, u * 0.05); }
    // wifi: three arcs
    var wx = LW * 0.80, wy = cy + u * 0.36; x.lineCap = 'round'; x.strokeStyle = white;
    for (var r = 1; r <= 3; r++) { x.beginPath(); x.lineWidth = u * 0.17; x.arc(wx, wy, u * 0.28 * r, Math.PI * 1.25, Math.PI * 1.75); x.stroke(); }
    x.beginPath(); x.arc(wx, wy, u * 0.09, 0, Math.PI * 2); x.fill();
    // battery
    var bx = LW * 0.855, by = cy - u * 0.33, bw = u * 1.25, bh2 = u * 0.66;
    x.lineWidth = u * 0.07; x.strokeStyle = 'rgba(255,255,255,.55)'; rrPath(x, bx, by, bw, bh2, u * 0.16); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.55)'; rr(x, bx + bw + u * 0.07, by + bh2 * 0.3, u * 0.08, bh2 * 0.4, u * 0.04);
    x.fillStyle = white; rr(x, bx + u * 0.1, by + u * 0.1, (bw - u * 0.2) * 0.86, bh2 - u * 0.2, u * 0.1);
  }
  function rrPath(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function rr(x, X, Y, w, h, r) { rrPath(x, X, Y, w, h, r); x.fill(); }
  function sampleColor(img, X, Y) { var c = document.createElement('canvas'); c.width = c.height = 1; var x = c.getContext('2d'); x.drawImage(img, X, Y, 1, 1, 0, 0, 1, 1); var d = x.getImageData(0, 0, 1, 1).data; return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; }
  function makeTex(src, sbh, done) { var img = new Image(); img.onerror = fail; img.onload = function () { try {
      var L = document.createElement('canvas'); L.width = LW; L.height = LH; var x = L.getContext('2d'); x.imageSmoothingQuality = 'high';
      var iw = img.width, ih = img.height, top = Math.round(ih * sbh);        // drop the screenshot's own (Android) status bar
      var headerColor = sampleColor(img, Math.round(iw / 2), top + 4);
      x.fillStyle = headerColor; x.fillRect(0, 0, LW, LH);
      var ch = ih - top, cw = iw, targetA = LW / (LH - SBH), a = cw / ch;      // fit the content under the status bar, crop the excess
      var sxp = 0, syp = top;
      if (a > targetA) { cw = ch * targetA; sxp = (iw - cw) / 2; }   // wider: crop the sides; taller: fit it whole (a hair squeezed), so the tab bar is never cut
      x.drawImage(img, sxp, syp, cw, ch, 0, SBH, LW, LH - SBH);
      statusBar(x, headerColor);
      var c = document.createElement('canvas'); c.width = 1024; c.height = 2048; var t = c.getContext('2d'); t.imageSmoothingQuality = 'high';
      t.drawImage(L, 0, 0, 1024, 2048);                                       // power-of-two texture; the screen plate stretches it back to the exact aspect
      done(texFromCanvas(c)); } catch (e) { fail(); } }; img.src = src; }
  var failed = false;
  function fail() { if (failed) return; failed = true; try { stage.removeChild(canvas); } catch (e) { } stage.classList.remove('gl'); } // back to the CSS ring (e.g. file:// where images taint the canvas)
  function texFromCanvas(c) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); } catch (e) { fail(); return t; }
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); return t; }
  function splashTex(done) { // navy screen with the Nirmand logo (assets/logo.png)
    var L = document.createElement('canvas'); L.width = LW; L.height = LH; var x = L.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.fillStyle = '#071029'; x.fillRect(0, 0, LW, LH);
    var g = x.createRadialGradient(LW / 2, LH / 2, 40, LW / 2, LH / 2, LH * 0.42); g.addColorStop(0, 'rgba(47,123,255,.22)'); g.addColorStop(1, 'rgba(47,123,255,0)'); x.fillStyle = g; x.fillRect(0, 0, LW, LH);
    function fin() { var c = document.createElement('canvas'); c.width = 1024; c.height = 2048; var t = c.getContext('2d'); t.imageSmoothingQuality = 'high'; t.drawImage(L, 0, 0, 1024, 2048); done(texFromCanvas(c)); }
    var img = new Image(); img.onload = function () { var w = LW * 0.58, h = img.height * w / img.width; x.drawImage(img, (LW - w) / 2, LH / 2 - h / 2, w, h); fin(); };
    img.onerror = fin; img.src = 'assets/logo.png';
  }
  var shots = Array.prototype.map.call(cssRing.querySelectorAll('.p3d-front img'), function (i) { return { src: i.getAttribute('src'), sb: +(i.getAttribute('data-sb') || 0) }; });
  var N = shots.length, tex = new Array(N), splash = null, loaded = 0;
  shots.forEach(function (s, i) { makeTex(s.src, s.sb, function (t) { tex[i] = t; loaded++; }); });
  splashTex(function (t) { splash = t; });
  // shadow blob texture
  var sc_ = document.createElement('canvas'); sc_.width = 128; sc_.height = 128; var sx = sc_.getContext('2d');
  var sg = sx.createRadialGradient(64, 64, 4, 64, 64, 62); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(0.5, 'rgba(0,0,0,.22)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = sg; sx.fillRect(0, 0, 128, 128);
  var shadowTex = texFromCanvas(sc_);

  /* ---------------- scene state ---------------- */
  var RING_R = 1.1, AMP = 1.05, ang = 0, vel = 0, drag = false, lx = 0, on = true, t0 = null, started = false;
  var SPEED = reduce ? 0 : 0.19; // rad/s (~33 s per turn)
  function ease(k) { return k < 0 ? 0 : k > 1 ? 1 : 1 - Math.pow(1 - k, 3); }
  function easeIO(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
  function backOut(k) { k = Math.max(0, Math.min(1, k)); var s = 1.4; return 1 + (--k) * k * ((s + 1) * k + s); }

  function resize() { var dpr = Math.min(2, window.devicePixelRatio || 1), w = canvas.clientWidth || stage.clientWidth, h = canvas.clientHeight || stage.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); } }
  window.addEventListener('resize', resize);

  stage.addEventListener('pointerdown', function (e) { if (!started || (e.button && e.button !== 0)) return; drag = true; lx = e.clientX; lmt = performance.now(); vel = 0; stage.classList.add('drag'); try { stage.setPointerCapture(e.pointerId); } catch (x) { } });
  var lmt = 0;
  stage.addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - lx; lx = e.clientX; var d = dx * 0.0055, now = performance.now(), dts = Math.max(0.006, (now - lmt) / 1000); lmt = now; extra += d; vel = d / dts; });
  function up() { drag = false; stage.classList.remove('drag'); }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('lostpointercapture', up);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { on = e.isIntersecting; }); }).observe(stage);

  /* timeline (seconds from first visible frame with textures ready) — matched to the CRED opening:
     0–1.6   one big phone with the logo splash, still (the other six are stacked right behind it, hidden)
     1.6     it is "grabbed" and spun fast to the right; the stack behind fans out into the ring (0.8 s)
             while the camera pulls back (1.0 s); the spin decays to the slow continuous turn (~2 s)
     ring    front phone lowest, phones rise as they go to the sides and back */
  var T0 = 4.0, V0 = 2.4, TAU = 1.0, RAMP = 0.3, extra = 0, base = 0, baseOff = 0, baseLast = 0;
  /* v17: app-tour API. goTo(i) turns phone i to the front (shortest way) and pauses the auto-turn for a moment;
     onFront(cb) reports the phone at the front whenever it changes. The CSS ring's API (index.html) is kept as the fallback. */
  var cssApi = window.NirmandRing, cbs = (cssApi && cssApi._cbs) || [], lastFront = -1, holdUntil = 0, goA = null;
  window.NirmandRing = {
    goTo: function (i) { if (failed) { if (cssApi) cssApi.goTo(i); return; } if (!started) return; var tgt = i * 2 * Math.PI / N, d = tgt - ang; d = d - Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      holdUntil = performance.now() + 4500; vel = 0; if (Math.abs(d) > 1e-3) goA = { from: extra, to: extra + d, t0: performance.now() }; },
    onFront: function (cb) { cbs.push(cb); },
    release: function () { holdUntil = Math.min(holdUntil, performance.now() + 2500); if (failed && cssApi) cssApi.release(); } };
  function frame(now) {
    if (failed) return;
    requestAnimationFrame(frame);
    if (!on || document.hidden || !window.__nirmandLoaded) return;   // wait for the fonts, then start the intro
    if (loaded < N || !splash) return;
    if (t0 === null) t0 = now; var t = (now - t0) / 1000;
    if (reduce) t = 99;
    if (typeof window.__ringT === 'number') t = window.__ringT;    // deterministic frames for review tooling
    var dt = Math.min(0.05, (frame.last ? now - frame.last : 16.7) / 1000); frame.last = now;
    if (frame.n === undefined) { frame.n = 0; frame.slow = 0; } if (frame.n < 150) { frame.n++; if (now - frame.lastRaw > 48 && frame.n > 10) frame.slow++; if (frame.slow > 45) { fail(); return; } } frame.lastRaw = now;   // too slow to be smooth: hand over to the canvas ring
    resize(); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.CULL_FACE);

    // ring angle: the spin starts softly (0.35 s), peaks, then decays to the slow continuous turn; plus drag
    var u = Math.max(0, t - T0);
    var kr = Math.min(1, u / RAMP), G = RAMP * (kr * kr * kr - kr * kr * kr * kr / 2) + (u > RAMP ? TAU * (1 - Math.exp(-(u - RAMP) / TAU)) : 0);
    base = SPEED * u + (V0 - SPEED) * G;                 // closed form: frame-rate independent
    if (t >= T0 + 0.4) started = true;
    if (drag || now < holdUntil) baseOff += base - baseLast; baseLast = base;    // while the user holds the ring (or a tour chip), the auto-turn waits
    if (goA) { var gk = Math.min(1, (now - goA.t0) / 900); extra = goA.from + (goA.to - goA.from) * easeIO(gk); if (gk >= 1) goA = null; }
    else if (!drag) { extra += vel * dt; vel *= Math.pow(0.12, dt); }
    ang = -(base - baseOff) + extra;                      // drag follows the cursor; the auto-turn runs right to left
    if (typeof window.__ringT === 'number') stage.dataset.ang = ang.toFixed(3);
    if (started) { var fi = ((Math.round(ang * N / (2 * Math.PI)) % N) + N) % N; if (fi !== lastFront) { lastFront = fi; for (var ci = 0; ci < cbs.length; ci++) { try { cbs[ci](fi); } catch (e) { } } } }
    var spread = easeIO(u / 0.7);                                             // overall fan-out progress (shadows, framing)
    var k = easeIO((t - T0) / 1.0);                  // camera pull-back
    // camera: level with the phones (no forward tilt); slow zoom-out during the splash, then pull back to the ring
    var asp = canvas.width / canvas.height, FOV = 0.52, th2 = Math.tan(FOV / 2);
    var D = Math.max(6.7, (RING_R + 0.62) / (th2 * asp));        // ring view; pushed back only on narrow canvases
    var DSTART = Math.min(5.3, D * 0.84);                           // splash: one big phone
    var dist = DSTART + (D - DSTART) * easeIO(t / T0);              // slow zoom-out during the 4 s splash
    var cy = 0.3 * k;                                              // after the spread, frame between front (low) and back (high) phones
    var eye = [0, cy, dist], center = [0, cy, 0];
    var V = lookAt(eye, center, [0, 1, 0]), Pm = persp(FOV, asp, 0.1, 60);
    gl.uniformMatrix4fv(U.uV, false, V); gl.uniformMatrix4fv(U.uP, false, Pm); gl.uniform3fv(U.uCam, eye);

    // phones, sorted far -> near for correct blending
    var list = [];
    for (var i = 0; i < N; i++) {
      var sp = easeIO((u - i * 0.07) / 0.55);                                             // phones peel off the stack one after another
      var th = ang - sp * i * Math.PI * 2 / N, c = Math.cos(th), s = Math.sin(th);   // phones trail the turning front phone (never cross in front of it)
      var back = (1 - sp) * i * 0.13;                                                     // still stacked: sit just behind the front phone, along its normal
      var x = RING_R * s - back * Math.sin(ang), z = RING_R * c - back * Math.cos(ang);
      var y = AMP * (1 - c) / 2 * sp;                                                      // front lowest; sides and back rise
      list.push({ i: i, th: th, x: x, z: z, y: y, c: c, appear: 1 }); }
    list.sort(function (a, b) { return a.z - b.z; });
    list.forEach(function (ph) {
      var scale = 0.55 + 0.45 * ph.appear, alpha = Math.min(1, ph.appear * 1.4), dim = 0.72 + 0.28 * (ph.c + 1) / 2;
      var M = mul(mul(tr(ph.x, ph.y, ph.z), rotY(ph.th)), sc(scale, scale, scale));
      // ground shadow blob (lies flat under the phone)
      gl.depthMask(false);
      draw(shadowQ, mul(mul(tr(ph.x, ph.y - H / 2 * scale - 0.02, ph.z), mul(rotY(ph.th), rotX(-Math.PI / 2))), sc(0.78 * scale, 0.42 * scale, 1)), { tex: shadowTex, alpha: 0.9 * alpha * spread, dim: 1 });
      gl.depthMask(true);
      var body_ = { color: NAVY, metal: 0.5, rough: 0.5, railMetal: 1.0, railRough: 0.16, alpha: alpha, dim: dim };
      draw(body, M, body_);
      // front: screen + island
      var mix = ph.i === 0 ? easeIO((t - T0 - 0.15) / 0.35) : 1;
      draw(screen, mul(M, tr(0, 0, T / 2 + 0.002)), { tex: ph.i === 0 ? splash : tex[ph.i], tex2: tex[ph.i], mix: mix, alpha: alpha, dim: 0.85 + 0.15 * dim });
      draw(island, mul(M, tr(0, H / 2 - BEZ - SB * (H - 2 * BEZ) / 2, T / 2 + 0.004)), { color: [0.01, 0.01, 0.03], metal: 0, rough: 0.3, alpha: alpha, dim: 1 });
      // back: camera plateau + three lenses + flash
      var back = mul(M, mul(tr((W / 2 - 0.30), H / 2 - 0.30, -T / 2), rotY(Math.PI)));
      draw(plateau, mul(back, tr(0, 0, 0.025)), { color: [0.11, 0.17, 0.34], metal: 0.6, rough: 0.5, railMetal: 1.0, railRough: 0.2, alpha: alpha, dim: dim });
      [[-0.105, 0.105], [-0.105, -0.105], [0.105, 0.105]].forEach(function (p) {
        var Lm = mul(back, tr(p[0], p[1], 0.05));
        draw(lensRing, Lm, { color: RAIL, metal: 1.0, rough: 0.18, alpha: alpha, dim: dim });
        draw(lensGlass, Lm, { color: [0.03, 0.05, 0.12], metal: 0.2, rough: 0.08, alpha: alpha, dim: dim });
        draw(lensInner, mul(Lm, tr(0, 0, 0.002)), { color: [0.0, 0.0, 0.02], metal: 0.1, rough: 0.05, alpha: alpha, dim: dim });
      });
      draw(flash, mul(back, tr(0.105, -0.105, 0.05)), { color: [0.98, 0.92, 0.72], metal: 0, rough: 0.3, alpha: alpha, dim: dim });
      // buttons: left rail = action + vol up + vol down; right rail = power. Each sits in a dark groove and protrudes 0.02.
      var rail = { color: [0.30, 0.38, 0.62], metal: 1.0, rough: 0.24, railMetal: 1.0, railRough: 0.24, alpha: alpha, dim: dim };
      var groove = { color: [0.02, 0.03, 0.08], metal: 0.2, rough: 0.8, alpha: alpha, dim: dim };
      [[-1, 0.36, btnA, grvA], [-1, 0.52, btnL, grvL], [-1, 0.72, btnL, grvL], [1, 0.50, btnP, grvP]].forEach(function (bt) {
        var side = bt[0], Mb = mul(M, mul(tr(side * (W / 2 + 0.004), H / 2 - bt[1], 0), rotY(side * Math.PI / 2)));
        draw(bt[3], Mb, groove);
        draw(bt[2], mul(Mb, tr(0, 0, 0.004)), rail);
      });
    });
  }
  resize(); requestAnimationFrame(frame);
})();
