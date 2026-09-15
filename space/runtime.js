/* Decorative renderer only. Existing shell DOM, text, focus and APIs stay owned by the shell. */
window.FixarSpaceMount = (host, fail, ready, registerCleanup) => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const panel = document.getElementById('canvaspane');
  const mapSurface = document.getElementById('field');
  let alive = true, overview = false, loaded = false, raf = 0, last = 0, lastDraw = 0;
  let yaw = .4, pitch = 0, driftX = .000006, driftY = 0;
  let impulseX = 0, impulseY = 0, pointerX = 0, pointerY = 0;
  let pointerTargetX = 0, pointerTargetY = 0;
  let returnFocus = document.activeElement;
  let gl, program, buffer, texture, resolutionUniform, viewUniform;
  let observer, mapObserver, image, flight;
  const shaders = [], animations = [], removals = [], enhancedMaps = [], practiceNodeRemovals = [];
  const modelMaps = new Map();
  const dispose = () => {
    alive = false; stop();
    if (observer) observer.disconnect();
    if (mapObserver) mapObserver.disconnect();
    enhancedMaps.splice(0).forEach(restoreObjectMap);
    modelMaps.forEach(controller => controller.dispose()); modelMaps.clear();
    practiceNodeRemovals.splice(0).forEach(remove => remove());
    removals.forEach(remove => remove());
    animations.forEach(animation => animation.cancel());
    if (flight) flight.remove();
    document.body.removeAttribute('data-fs-screen-transition');
    document.body.removeAttribute('data-fs-scope');
    if (image) image.onload = image.onerror = null;
    if (gl) {
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
      gl = null;
    }
  };
  registerCleanup(dispose);
  const safe = fn => (...args) => { if (alive) { try { return fn(...args); } catch (_) { fail(); } } };
  function listen(target, type, callback) {
    const guarded = safe(callback);
    target.addEventListener(type, guarded);
    removals.push(() => target.removeEventListener(type, guarded));
  }

  /* The shell owns objects, navigation and all pointer/keyboard behaviour.
     This layer only replaces their paint and temporary placement. Every DOM
     mutation is tagged and reversible so disabling the enhancement restores
     the exact live SVG rather than a copy of it. */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgNode(name, attributes) {
    const node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(key => node.setAttribute(key, attributes[key]));
    return node;
  }
  function stopNode(parent, offset, color, opacity) {
    parent.appendChild(svgNode('stop', {offset, 'stop-color': color, 'stop-opacity': opacity == null ? 1 : opacity}));
  }
  function paintDefinitions() {
    const defs = svgNode('defs', {'data-fs-injected': 'definitions'});
    const gradient = (name, kind, attributes, stops) => {
      const node = svgNode(kind, {id: name, ...attributes});
      stops.forEach(stop => stopNode(node, ...stop));
      defs.appendChild(node);
      return node;
    };
    gradient('fs-glass-shell', 'radialGradient', {cx: '.31', cy: '.18', r: '.92'}, [
      ['0%', '#dffcff', .2], ['28%', '#6ceaff', .075], ['66%', '#123d55', .12], ['100%', '#03121c', .34]
    ]);
    gradient('fs-glass-front', 'linearGradient', {x1: '0', y1: '0', x2: '0', y2: '1'}, [
      ['0%', '#8deeff', 0], ['52%', '#48dff8', .045], ['100%', '#b8f7ff', .18]
    ]);
    gradient('fs-glass-rim', 'linearGradient', {x1: '0', y1: '0', x2: '1', y2: '0'}, [
      ['0%', '#57dcef', .16], ['18%', '#e9fdff', .9], ['54%', '#55dff7', .38], ['82%', '#bff8ff', .72], ['100%', '#2dc6e5', .13]
    ]);
    gradient('fs-hemi-shadow-paint', 'radialGradient', {cx: '.5', cy: '.5', r: '.5'}, [
      ['0%', '#00070c', .72], ['58%', '#00131c', .38], ['100%', '#00131c', 0]
    ]);
    gradient('fs-material-top', 'linearGradient', {x1: '0', y1: '0', x2: '1', y2: '1'}, [
      ['0%', '#ffffff', 1], ['17%', '#f8f4e9', 1], ['54%', '#d8d0bd', 1], ['100%', '#918978', 1]
    ]);
    gradient('fs-material-left', 'linearGradient', {x1: '0', y1: '0', x2: '1', y2: '1'}, [
      ['0%', '#eee8d9', 1], ['44%', '#bcb29d', 1], ['100%', '#716b60', 1]
    ]);
    gradient('fs-material-right', 'linearGradient', {x1: '0', y1: '0', x2: '1', y2: '1'}, [
      ['0%', '#aaa28f', 1], ['48%', '#756f63', 1], ['100%', '#373a3a', 1]
    ]);
    gradient('fs-material-dark', 'radialGradient', {cx: '.34', cy: '.28', r: '.72'}, [
      ['0%', '#7f827c', 1], ['48%', '#444b49', 1], ['100%', '#141c1e', 1]
    ]);
    gradient('fs-material-gold', 'linearGradient', {x1: '0', y1: '0', x2: '1', y2: '1'}, [
      ['0%', '#ffe8a6', 1], ['28%', '#dca24c', 1], ['72%', '#96601e', 1], ['100%', '#4d2e10', 1]
    ]);
    gradient('fs-specular-paint', 'linearGradient', {x1: '0', y1: '0', x2: '1', y2: '1'}, [
      ['0%', '#ffffff', .86], ['24%', '#dffcff', .33], ['48%', '#ffffff', 0], ['100%', '#ffffff', 0]
    ]);
    gradient('fs-contact-shadow-paint', 'radialGradient', {cx: '.42', cy: '.5', r: '.58'}, [
      ['0%', '#000000', .84], ['62%', '#00070b', .48], ['100%', '#00070b', 0]
    ]);
    const depth = svgNode('filter', {id: 'fs-object-depth', x: '-70%', y: '-80%', width: '250%', height: '280%', 'color-interpolation-filters': 'sRGB'});
    depth.appendChild(svgNode('feDropShadow', {dx: '4.5', dy: '8', stdDeviation: '3.4', 'flood-color': '#01070b', 'flood-opacity': '.78'}));
    depth.appendChild(svgNode('feDropShadow', {dx: '-1.2', dy: '-1.8', stdDeviation: '1.1', 'flood-color': '#c9f8ff', 'flood-opacity': '.25'}));
    defs.appendChild(depth);
    const contact = svgNode('filter', {id: 'fs-contact-blur', x: '-80%', y: '-200%', width: '280%', height: '500%'});
    contact.appendChild(svgNode('feGaussianBlur', {stdDeviation: '2.8'}));
    defs.appendChild(contact);
    const glow = svgNode('filter', {id: 'fs-glass-glow', x: '-30%', y: '-60%', width: '160%', height: '220%'});
    glow.appendChild(svgNode('feGaussianBlur', {stdDeviation: '4', result: 'blur'}));
    const merge = svgNode('feMerge', {});
    merge.appendChild(svgNode('feMergeNode', {in: 'blur'}));
    merge.appendChild(svgNode('feMergeNode', {in: 'SourceGraphic'}));
    glow.appendChild(merge); defs.appendChild(glow);
    return defs;
  }
  function translatedPoint(node) {
    const match = /translate\(\s*(-?[\d.]+)(?:[ ,]+)(-?[\d.]+)\s*\)/.exec(node.getAttribute('transform') || '');
    return match ? {x: Number(match[1]), y: Number(match[2])} : null;
  }
  function domePath(cx, top, rx, base) {
    const left = cx - rx, right = cx + rx, shoulder = rx * .58;
    return `M${left},${base} C${left + rx * .04},${top + (base - top) * .34} ${cx - shoulder},${top} ${cx},${top}`
      + ` C${cx + shoulder},${top} ${right - rx * .04},${top + (base - top) * .34} ${right},${base}`
      + ` Q${cx},${base + (base - top) * .22} ${left},${base} Z`;
  }
  function hemisphere(svg, figures, viewBox) {
    const [vx, vy, vw, vh] = viewBox;
    const count = figures.length;
    const cx = vx + vw / 2, cy = vy + vh * .43;
    const rx = Math.min(vw * .46, Math.max(vw * .31, Math.sqrt(count) * 164));
    const ry = Math.min(vh * .36, Math.max(vh * .23, Math.sqrt(count) * 84));
    const top = cy - ry, base = cy + ry * .48;
    const back = svgNode('g', {class: 'fs-hemisphere-back', 'aria-hidden': 'true', 'data-fs-injected': 'hemisphere-back'});
    back.appendChild(svgNode('ellipse', {class: 'fs-hemi-shadow', cx, cy: base + ry * .28, rx: rx * .9, ry: ry * .24}));
    back.appendChild(svgNode('path', {class: 'fs-hemi-shell', d: domePath(cx, top, rx, base)}));
    const grid = [];
    [-.56, -.18, .2].forEach(level => {
      const y = cy + level * ry, half = rx * Math.sqrt(Math.max(.12, 1 - level * level));
      grid.push(`M${cx - half},${y} Q${cx},${y + ry * (.12 + level * .06)} ${cx + half},${y}`);
    });
    grid.push(`M${cx},${top} C${cx - rx * .32},${cy - ry * .3} ${cx - rx * .34},${cy + ry * .18} ${cx - rx * .42},${base}`);
    grid.push(`M${cx},${top} C${cx + rx * .32},${cy - ry * .3} ${cx + rx * .34},${cy + ry * .18} ${cx + rx * .42},${base}`);
    grid.push(`M${cx},${top} C${cx - rx * .08},${cy - ry * .24} ${cx - rx * .08},${cy + ry * .22} ${cx},${base}`);
    back.appendChild(svgNode('path', {class: 'fs-hemi-grid', d: grid.join(' ')}));
    back.appendChild(svgNode('path', {class: 'fs-hemi-horizon', d: `M${cx - rx},${base} Q${cx},${base - ry * .23} ${cx + rx},${base}`}));
    const front = svgNode('g', {class: 'fs-hemisphere-front', 'aria-hidden': 'true', 'data-fs-injected': 'hemisphere-front'});
    front.appendChild(svgNode('path', {class: 'fs-hemi-front-glass', d: `M${cx - rx},${base} Q${cx},${base + ry * .31} ${cx + rx},${base} Q${cx},${base - ry * .23} ${cx - rx},${base} Z`}));
    front.appendChild(svgNode('path', {class: 'fs-hemi-rim', d: `M${cx - rx},${base} Q${cx},${base + ry * .31} ${cx + rx},${base}`}));
    front.appendChild(svgNode('path', {class: 'fs-hemi-glint', d: `M${cx - rx * .82},${cy - ry * .24} C${cx - rx * .68},${top + ry * .14} ${cx - rx * .34},${top + ry * .02} ${cx - rx * .08},${top + ry * .06}`}));
    return {back, front, cx, cy, rx, ry};
  }
  function sphericalPoint(index, count) {
    if (count === 1) return {x: 0, y: -.05, z: 1};
    const rows = Math.max(1, Math.ceil(Math.sqrt(count * .72)));
    const base = Math.floor(count / rows), extra = count % rows;
    let first = 0, row = 0, length = base;
    for (; row < rows; row += 1) {
      length = base + (row >= rows - extra ? 1 : 0);
      if (index < first + length) break;
      first += length;
    }
    const column = index - first;
    const y = rows === 1 ? 0 : -.59 + 1.18 * row / (rows - 1);
    const half = .82 * Math.sqrt(Math.max(.28, 1 - y * y * .7));
    const x = length === 1 ? 0 : -half + 2 * half * column / (length - 1);
    return {x, y, z: Math.sqrt(Math.max(.08, 1 - x * x - y * y * .62))};
  }
  function wrapFigure(figure) {
    const parts = Array.from(figure.children).filter(node => {
      const classes = ` ${node.getAttribute('class') || ''} `;
      return classes.includes(' edge ') || classes.includes(' face ') || classes.includes(' line ');
    });
    if (!parts.length) return;
    const body = svgNode('g', {class: 'fs-figure-body', 'data-fs-injected': 'figure-body'});
    figure.insertBefore(body, parts[0]); parts.forEach(part => body.appendChild(part));
    Array.from(body.children).forEach(part => {
      const classes = ` ${part.getAttribute('class') || ''} `;
      if (!classes.includes(' f-верх ') && !classes.includes(' f-скат ') && !classes.includes(' f-голова ')) return;
      body.appendChild(svgNode('path', {class: 'fs-highlight', d: part.getAttribute('d') || ''}));
    });
    const contact = Array.from(figure.children).find(node => ` ${node.getAttribute('class') || ''} `.includes(' shadow '));
    const cast = svgNode('ellipse', {class: 'fs-cast-shadow', cx: '14', cy: '27', rx: '39', ry: '8', transform: 'rotate(-10 14 27)', 'data-fs-injected': 'cast-shadow'});
    figure.insertBefore(cast, contact || body);
    const name = Array.from(figure.children).find(node => ` ${node.getAttribute('class') || ''} `.includes(' name '));
    if (name) {
      const width = Math.max(48, Math.min(148, String(name.textContent || '').length * 7 + 14));
      figure.insertBefore(svgNode('rect', {class: 'fs-nameplate', x: -width / 2, y: '38.5', width, height: '18', rx: '9', 'data-fs-injected': 'nameplate'}), name);
    }
    const kids = Array.from(figure.children).find(node => ` ${node.getAttribute('class') || ''} `.includes(' kids '));
    if (kids) {
      const width = Math.max(54, Math.min(124, String(kids.textContent || '').length * 6.1 + 13));
      figure.insertBefore(svgNode('rect', {class: 'fs-kidsplate', x: -width / 2, y: '56.5', width, height: '16', rx: '8', 'data-fs-injected': 'kidsplate'}), kids);
    }
  }
  function restoreObjectMap(svg) {
    if (!svg || svg.getAttribute('data-fs-object-map') !== '1') return;
    const models = modelMaps.get(svg);
    if (models) { models.dispose(); modelMaps.delete(svg); }
    Array.from(svg.querySelectorAll('[data-fs-injected="figure-body"]')).forEach(body => {
      const parent = body.parentNode;
      Array.from(body.children).forEach(child => {
        if (` ${child.getAttribute('class') || ''} `.includes(' fs-highlight ')) child.remove();
        else parent.insertBefore(child, body);
      });
      body.remove();
    });
    Array.from(svg.querySelectorAll('[data-fs-injected]:not([data-fs-injected="figure-body"])')).forEach(node => node.remove());
    Array.from(svg.querySelectorAll('.fig[data-fs-origin-transform]')).forEach(figure => {
      figure.setAttribute('transform', figure.getAttribute('data-fs-origin-transform'));
      figure.removeAttribute('data-fs-origin-transform');
      figure.removeAttribute('data-fs-depth');
    });
    svg.removeAttribute('data-fs-object-map');
  }
  function requestModel(figure, maxBytes) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true; clearTimeout(timer); callback(value);
      };
      const detail = {
        entityId: figure.getAttribute('data-id') || '',
        documentId: figure.getAttribute('data-model-document') || '',
        maxBytes,
        handled: false,
        resolve: value => finish(resolve, value),
        reject: error => finish(reject, error),
      };
      const timer = setTimeout(() => finish(reject, new Error('3D model request timed out')), 15000);
      figure.dispatchEvent(new CustomEvent('fixar:model-request', {bubbles: true, detail}));
      if (!detail.handled) finish(reject, new Error('No owner for this 3D model'));
    });
  }
  function enhanceModelFigures(svg, figures) {
    const modeled = figures.filter(figure => {
      const bytes = Number(figure.getAttribute('data-model-bytes') || 0);
      return figure.getAttribute('data-model-document') && bytes > 0 && bytes <= 4 * 1024 * 1024;
    });
    if (!modeled.length || modelMaps.has(svg)) return;
    const load = () => import('/space/model-thumbnails.js').then(module => {
      if (!alive || !svg.isConnected || svg.getAttribute('data-fs-object-map') !== '1') return;
      const controller = module.mountModelThumbnails({
        figures: modeled,
        requestModel,
        // A map may hold hundreds of things. Render the first visible handful;
        // the exact SVG remains for the rest instead of downloading everything.
        limit: 8,
      });
      modelMaps.set(svg, controller);
      controller.ready.catch(() => {});
    }).catch(() => {
      // 3D is optional. The already-painted SVG is the complete fallback.
    });
    /* Parsing models must never compete with the first useful chat paint.
       Idle time is an optimization only; older browsers get a short timer. */
    if (typeof window.requestIdleCallback === 'function') {
      const idle = window.requestIdleCallback(load, {timeout: 1800});
      removals.push(() => window.cancelIdleCallback(idle));
    } else {
      const timer = setTimeout(load, 320);
      removals.push(() => clearTimeout(timer));
    }
  }
  function enhanceObjectMap() {
    if (!mapSurface || typeof mapSurface.querySelector !== 'function') return;
    for (let i = enhancedMaps.length - 1; i >= 0; i -= 1) {
      if (!enhancedMaps[i].isConnected) { restoreObjectMap(enhancedMaps[i]); enhancedMaps.splice(i, 1); }
    }
    const svg = mapSurface.querySelector('svg');
    if (!svg) { host.removeAttribute('data-fs-has-map'); return; }
    if (svg.getAttribute('data-fs-object-map') === '1') return;
    const figures = Array.from(svg.querySelectorAll('.fig'));
    if (!figures.length) { host.removeAttribute('data-fs-has-map'); return; }
    const raw = (svg.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
    if (raw.length !== 4 || raw.some(value => !Number.isFinite(value)) || raw[2] <= 0 || raw[3] <= 0) return;
    svg.setAttribute('data-fs-object-map', '1');
    host.setAttribute('data-fs-has-map', 'true');
    const defs = paintDefinitions(); svg.insertBefore(defs, svg.firstChild);
    const dome = hemisphere(svg, figures, raw);
    const scene = svg.querySelector('.scene');
    svg.insertBefore(dome.back, scene || defs.nextSibling);
    const objectLayer = figures[0].parentNode;
    if (objectLayer && objectLayer.parentNode === svg) svg.insertBefore(dome.front, objectLayer.nextSibling);
    else svg.appendChild(dome.front);
    figures.forEach((figure, index) => {
      const original = translatedPoint(figure);
      if (!original) return;
      figure.setAttribute('data-fs-origin-transform', figure.getAttribute('transform') || '');
      const point = sphericalPoint(index, figures.length);
      const x = dome.cx + point.x * dome.rx * .82;
      const y = dome.cy + point.y * dome.ry * .72 - point.z * dome.ry * .08;
      const depth = Math.max(0, Math.min(1, (point.y + .72) / 1.44));
      const scale = 1.18 + depth * .28 + point.z * .08;
      figure.setAttribute('data-fs-depth', String(Math.round(depth * 100)));
      figure.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scale.toFixed(3)})`);
      wrapFigure(figure);
    });
    enhancedMaps.push(svg);
    enhanceModelFigures(svg, figures);
  }
  /* The map is permanent spatial context, including before the first object
     exists. The live object SVG replaces this quiet empty hemisphere as soon
     as the shell has something exact to draw. */
  const ambientMap = document.createElement('div');
  ambientMap.className = 'fs-ambient-map'; ambientMap.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 5; index += 1) {
    const latitude = document.createElement('span');
    latitude.className = 'fs-ambient-latitude fs-ambient-latitude-' + index;
    ambientMap.append(latitude);
  }
  for (let index = 0; index < 5; index += 1) {
    const longitude = document.createElement('span');
    longitude.className = 'fs-ambient-longitude fs-ambient-longitude-' + index;
    ambientMap.append(longitude);
  }
  host.append(ambientMap);

  /* The nebula itself is the overview control. It is a real keyboard-focusable
     button, but has no separate chrome: bare space is both affordance and hit
     area. Live shell surfaces remain above it and keep their own behaviour. */
  const sky = document.createElement('div');
  sky.className = 'fs-sky'; sky.setAttribute('role', 'button'); sky.tabIndex = 0;
  sky.setAttribute('aria-label', 'Обзор пространства');
  sky.setAttribute('aria-pressed', 'false');
  const canvas = document.createElement('canvas'); sky.append(canvas); host.prepend(sky);

  /* Attribution stays available without bringing the removed prototype
     control window back. */
  const credit = document.createElement('span');
  credit.className = 'fs-credit';
  const author = document.createElement('a'); author.href = 'https://sketchfab.com/jungle_jim'; author.textContent = 'Jungle Jim'; author.rel = 'noreferrer';
  const license = document.createElement('a'); license.href = 'https://creativecommons.org/licenses/by/4.0/'; license.textContent = 'CC BY 4.0 · адаптировано'; license.rel = 'noreferrer';
  credit.append(author, document.createTextNode(' · '), license);
  host.append(credit);

  const graph = document.createElement('div'); graph.id = 'fixar-space-graph'; graph.className = 'fs-graph';
  graph.setAttribute('aria-label', 'Ваша сфера'); graph.setAttribute('aria-hidden', 'true');
  sky.setAttribute('aria-controls', 'fixar-space-graph');
  const graphIntro = document.createElement('div'); graphIntro.className = 'fs-graph-intro';
  const graphHeading = document.createElement('strong'); graphHeading.textContent = 'Ваша сфера';
  const graphExplanation = document.createElement('span'); graphExplanation.textContent = 'Дополняйте её новым или сужайте до нужного';
  graphIntro.append(graphHeading, graphExplanation);
  const practiceBack = document.createElement('button'); practiceBack.type = 'button';
  practiceBack.className = 'fs-practice-back'; practiceBack.textContent = '← Ваша сфера';
  practiceBack.setAttribute('aria-label', 'Вернуться в вашу сферу'); practiceBack.hidden = true;
  const graphTitle = document.createElement('span'); graphTitle.className = 'fs-graph-title'; graphTitle.textContent = 'Вы здесь';
  /* Map is deliberately absent: it is the permanent hemisphere under every
     screen, not another screen stored in a capsule. */
  const graphLabels = panel ? ['Разговор', 'Холст', 'Документы'] : ['Диалог', 'Документ'];
  const graphNodes = graphLabels.map((label, index) => {
    const node = document.createElement('button'); node.type = 'button';
    node.className = 'fs-graph-node fs-node-' + index;
    node.setAttribute('aria-label', 'Открыть экран «' + label + '»'); node.tabIndex = -1;
    const icon = document.createElement('span'); icon.className = 'fs-node-icon';
    const kind = document.createElement('span'); kind.className = 'fs-node-kind'; kind.textContent = 'Капсула';
    const name = document.createElement('strong'); name.textContent = label;
    node.append(icon, kind, name);
    graph.append(node); return node;
  });
  for (let index = 0; index < graphNodes.length; index += 1) {
    const edge = document.createElement('span'); edge.className = 'fs-graph-edge fs-edge-' + index; graph.prepend(edge);
  }
  graph.prepend(graphTitle); graph.prepend(practiceBack); graph.prepend(graphIntro); host.append(graph);

  /* Practices are projected by the root shell over DOM events. This layer
     keeps no API client and receives only public labels plus the stable
     domain/kind key; calendar and knowledge-base identifiers never cross the
     boundary. Rebuilding these lightweight points cannot mutate shell state. */
  let practices = [], activePracticeKey = '', practiceScope = null, revealedPracticeKey = '';
  const practiceNodes = [];
  function cleanPractice(input) {
    if (!input || typeof input !== 'object') return null;
    const text = value => typeof value === 'string' ? value.trim().slice(0, 200) : '';
    const key = text(input.key);
    if (!key || key.indexOf('/') < 1) return null;
    return {
      id: text(input.id), key, title: text(input.title) || text(input.kindTitle) || key,
      domain: text(input.domain), domainTitle: text(input.domainTitle) || text(input.domain),
      kindTitle: text(input.kindTitle),
    };
  }
  function practiceByKey(key) {
    return practices.find(practice => practice.key === key) || null;
  }
  function practicePoint(index, count) {
    /* Four compact doors per mobile arc keep every hit target separate at
       390px. Desktop has room for five labelled doors. The same canonical
       practice list drives both arrangements. */
    const perRing = mobile.matches ? 4 : 5, ring = Math.floor(index / perRing);
    const first = ring * perRing, length = Math.min(perRing, count - first);
    const column = index - first;
    const t = length === 1 ? .5 : column / (length - 1);
    const angle = Math.PI * ((mobile.matches ? .16 : .18) + (mobile.matches ? .68 : .64) * t);
    const radiusX = mobile.matches ? Math.max(24, 36 - ring * 4) : Math.max(20, 35 - ring * 6);
    const radiusY = mobile.matches ? Math.max(12, 19 - ring * 2) : Math.max(10, 25 - ring * 5);
    /* Successive arcs climb the sphere instead of lying on top of one
       another. Five doors fit a desktop arc with readable names; the next
       five occupy the inner arc and keep the centre marker visible. */
    return mobile.matches
      ? {x: 50 + Math.cos(angle) * radiusX, y: 59 - ring * 16 + Math.sin(angle) * radiusY}
      : {x: 50 + Math.cos(angle) * radiusX, y: 51 - ring * 22 + Math.sin(angle) * radiusY};
  }
  function rebuildPracticeNodes() {
    practiceNodeRemovals.splice(0).forEach(remove => remove());
    practiceNodes.splice(0).forEach(node => node.remove());
    const seen = new Set();
    practices = practices.filter(practice => {
      if (seen.has(practice.key)) return false;
      seen.add(practice.key); return true;
    });
    practices.forEach((practice, index) => {
      const point = practicePoint(index, practices.length);
      const node = document.createElement('button'); node.type = 'button';
      node.className = 'fs-graph-node fs-practice-node'
        + (practice.key === activePracticeKey ? ' is-selected' : '')
        + (practice.key === revealedPracticeKey ? ' is-revealed' : '');
      node.setAttribute('data-practice-key', practice.key);
      node.setAttribute('aria-label', 'Войти в кабинет «' + practice.title + '»'
        + (practice.domainTitle ? ' · ' + practice.domainTitle : ''));
      node.style.left = point.x.toFixed(2) + '%'; node.style.top = point.y.toFixed(2) + '%';
      const icon = document.createElement('span'); icon.className = 'fs-practice-icon';
      const kind = document.createElement('span'); kind.className = 'fs-node-kind'; kind.textContent = 'Кабинет';
      const name = document.createElement('strong'); name.textContent = practice.title;
      const domain = document.createElement('small'); domain.className = 'fs-practice-domain';
      domain.textContent = practice.domainTitle || practice.kindTitle;
      node.append(icon, kind, name, domain); graph.append(node); practiceNodes.push(node);
      const open = safe(event => enterPractice(practice, event, false));
      node.addEventListener('click', open);
      practiceNodeRemovals.push(() => node.removeEventListener('click', open));
    });
    host.setAttribute('data-fs-practice-count', String(practiceNodes.length));
    host.setAttribute('data-fs-practice-density', practiceNodes.length > 4 ? 'dense' : 'calm');
  }
  function applyPracticeSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.practices)) return;
    practices = snapshot.practices.map(cleanPractice).filter(Boolean);
    activePracticeKey = typeof snapshot.activeKey === 'string' ? snapshot.activeKey : '';
    host.setAttribute('data-fs-practices', snapshot.available === false ? 'unavailable' : 'ready');
    if (practiceScope) {
      const active = activePracticeKey ? practiceByKey(activePracticeKey) : null;
      practiceScope = active;
    }
    if (revealedPracticeKey && !practiceByKey(revealedPracticeKey)) revealedPracticeKey = '';
    rebuildPracticeNodes(); sync();
  }
  function modeIndex(value) {
    if (panel) return value === null ? 1 : 0;
    /* Root map mode changes how objects are operated, not which screen owns
       them. The map itself therefore never becomes a graph capsule. The
       explicit screen marker belongs to the small root shell/document
       contract and never contains document contents. */
    return value === 'document' ? 1 : 0;
  }
  function syncPracticeScope() {
    const inside = !!practiceScope;
    host.setAttribute('data-fs-scope', inside ? 'practice' : 'personal');
    document.body.setAttribute('data-fs-scope', inside ? 'practice' : 'personal');
    graph.setAttribute('data-fs-scope', inside ? 'practice' : 'personal');
    graph.setAttribute('aria-label', inside ? 'Кабинет «' + practiceScope.title + '»' : 'Ваша сфера');
    practiceBack.hidden = !inside;
    practiceBack.tabIndex = overview && inside ? 0 : -1;
    graphHeading.textContent = inside ? practiceScope.title : 'Ваша сфера';
    graphExplanation.textContent = inside
      ? 'Вогнутое пространство кабинета' + (practiceScope.domainTitle ? ' · ' + practiceScope.domainTitle : '')
      : 'Дополняйте её новым или сужайте до нужного';
    graphNodes.forEach(node => {
      const kind = node.children[1];
      if (kind) kind.textContent = inside ? 'Экран кабинета' : 'Капсула';
    });
    practiceNodes.forEach(node => {
      node.hidden = inside;
      node.tabIndex = overview && !inside ? 0 : -1;
    });
  }
  function syncGraph(value) {
    const active = modeIndex(value);
    graphTitle.textContent = (practiceScope ? 'Вы внутри · ' : 'Вы здесь · ') + graphLabels[active];
    graphNodes.forEach((node, index) => {
      node.className = 'fs-graph-node fs-node-' + index + (index === active ? ' is-active' : '');
      const reachable = !panel || index === active;
      node.tabIndex = overview && reachable ? 0 : -1;
      node.disabled = !reachable;
    });
    practiceNodes.forEach(node => {
      const key = node.getAttribute('data-practice-key');
      node.className = 'fs-graph-node fs-practice-node'
        + (key === activePracticeKey ? ' is-selected' : '')
        + (key === revealedPracticeKey ? ' is-revealed' : '');
      node.tabIndex = overview && !practiceScope ? 0 : -1;
      node.hidden = !!practiceScope;
    });
  }
  function keepAnimation(animation, removeNode, done) {
    animations.push(animation);
    if (!animation.finished) return;
    animation.finished.then(() => {
      const index = animations.indexOf(animation); if (index >= 0) animations.splice(index, 1);
      if (removeNode) { removeNode.remove(); if (flight === removeNode) flight = null; }
      if (done) done();
    }).catch(() => {});
  }
  function cancelAnimations() {
    animations.splice(0).forEach(animation => animation.cancel());
    if (flight) { flight.remove(); flight = null; }
    document.body.removeAttribute('data-fs-screen-transition');
    if (typeof state !== 'undefined') syncGraph(state);
  }
  const graphVectors = [['-28vw', '-24vh'], ['28vw', '-10vh'], ['0vw', '25vh']];
  function trackPointer(clientX, clientY) {
    const x = Number.isFinite(clientX) ? clientX : innerWidth / 2;
    const y = Number.isFinite(clientY) ? clientY : innerHeight / 2;
    const nx = Math.max(-1, Math.min(1, x / Math.max(1, innerWidth) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, y / Math.max(1, innerHeight) * 2 - 1));
    pointerTargetX = nx; pointerTargetY = ny;
    return {nx, ny};
  }
  function nudgeMotion(clientX, clientY, strength) {
    const {nx, ny} = trackPointer(clientX, clientY);
    impulseX += nx * .000007 * (strength || 1);
    impulseY -= ny * .0000035 * (strength || 1);
  }
  function launchFlight(from, to) {
    const fromIndex = typeof from === 'number' ? from : modeIndex(from);
    const toIndex = typeof to === 'number' ? to : modeIndex(to);
    if (fromIndex === toIndex || reduced.matches) return;
    if (flight) flight.remove();
    flight = document.createElement('div'); flight.className = 'fs-flight'; flight.setAttribute('aria-hidden', 'true');
    const phase = document.createElement('span'); phase.className = 'fs-flight-phase';
    phase.textContent = 'Экран → капсула → точка → капсула → экран';
    const label = document.createElement('strong'); label.textContent = graphLabels[fromIndex] + ' → ' + graphLabels[toIndex];
    flight.append(phase, label); host.append(flight);
    graphNodes[toIndex].className += ' is-target';
    const vectors = mobile.matches
      ? [['-31vw', '31vh'], ['31vw', '31vh'], ['0vw', '33vh']]
      : graphVectors;
    const fromVector = vectors[fromIndex] || vectors[0];
    const toVector = vectors[toIndex] || vectors[0];
    const duration = mobile.matches ? 760 : 1120;
    document.body.setAttribute('data-fs-screen-transition', 'true');
    nudgeMotion(toIndex === 1 ? innerWidth * .78 : innerWidth * .22,
      toIndex === 2 ? innerHeight * .78 : innerHeight * .28, 1.8);
    keepAnimation(flight.animate([
      {opacity:.94, transform:'translate(-50%, -50%) scale(1)', borderRadius:'18px'},
      {opacity:.92, offset:.25, transform:'translate(-50%, -50%) scale(.28,.2)', borderRadius:'999px'},
      {opacity:.12, offset:.44, transform:`translate(calc(-50% + ${fromVector[0]}), calc(-50% + ${fromVector[1]})) scale(.025,.05)`, borderRadius:'999px'},
      {opacity:.12, offset:.56, transform:`translate(calc(-50% + ${toVector[0]}), calc(-50% + ${toVector[1]})) scale(.025,.05)`, borderRadius:'999px'},
      {opacity:.92, offset:.75, transform:`translate(calc(-50% + ${toVector[0]}), calc(-50% + ${toVector[1]})) scale(.28,.2)`, borderRadius:'999px'},
      {opacity:.94, transform:'translate(-50%, -50%) scale(1)', borderRadius:'18px'}
    ], {duration, easing:'cubic-bezier(.18,.72,.18,1)'}), flight, () => {
      document.body.removeAttribute('data-fs-screen-transition'); syncGraph(state);
    });
  }
  function launchPracticeFlight(fromLabel, toLabel, node, entering) {
    if (reduced.matches) return;
    if (flight) flight.remove();
    flight = document.createElement('div');
    flight.className = 'fs-flight fs-practice-flight'; flight.setAttribute('aria-hidden', 'true');
    const phase = document.createElement('span'); phase.className = 'fs-flight-phase';
    phase.textContent = entering
      ? 'Точка → кабинет → пространство'
      : 'Пространство → кабинет → точка';
    const label = document.createElement('strong'); label.textContent = fromLabel + ' → ' + toLabel;
    flight.append(phase, label); host.append(flight);
    const left = node ? parseFloat(node.style.left || '50') : 50;
    const top = node ? parseFloat(node.style.top || '50') : 50;
    const vectorX = ((Number.isFinite(left) ? left : 50) - 50).toFixed(1) + 'vw';
    const vectorY = ((Number.isFinite(top) ? top : 50) - 50).toFixed(1) + 'vh';
    const point = `translate(calc(-50% + ${vectorX}), calc(-50% + ${vectorY})) scale(.025,.05)`;
    const capsule = `translate(calc(-50% + ${vectorX}), calc(-50% + ${vectorY})) scale(.24,.16)`;
    const screen = 'translate(-50%, -50%) scale(1)';
    const frames = entering ? [
      {opacity:.12, transform:point, borderRadius:'999px'},
      {opacity:.94, offset:.3, transform:capsule, borderRadius:'999px'},
      {opacity:.96, offset:.64, transform:'translate(-50%, -50%) scale(.72)', borderRadius:'42%'},
      {opacity:.96, transform:screen, borderRadius:'50%'}
    ] : [
      {opacity:.96, transform:screen, borderRadius:'50%'},
      {opacity:.94, offset:.42, transform:'translate(-50%, -50%) scale(.72)', borderRadius:'42%'},
      {opacity:.9, offset:.72, transform:capsule, borderRadius:'999px'},
      {opacity:.08, transform:point, borderRadius:'999px'}
    ];
    document.body.setAttribute('data-fs-screen-transition', 'true');
    nudgeMotion((Number.isFinite(left) ? left : 50) * innerWidth / 100,
      (Number.isFinite(top) ? top : 50) * innerHeight / 100, 2.1);
    keepAnimation(flight.animate(frames, {
      duration: mobile.matches ? 720 : 980, easing:'cubic-bezier(.18,.72,.18,1)'
    }), flight, () => {
      document.body.removeAttribute('data-fs-screen-transition'); sync();
    });
  }
  function enterPractice(practice, event, shellOwnsSelection) {
    let accepted = practice;
    if (!shellOwnsSelection) {
      const request = {key: practice.key, handled: false, practice: null};
      document.dispatchEvent(new CustomEvent('fixar:practice-open', {detail: request}));
      if (!request.handled) return false;
      accepted = cleanPractice(request.practice) || practiceByKey(practice.key) || practice;
    }
    cancelAnimations();
    practiceScope = accepted; activePracticeKey = accepted.key; revealedPracticeKey = '';
    overview = true; sync();
    const node = practiceNodes.find(item => item.getAttribute('data-practice-key') === accepted.key);
    launchPracticeFlight('Ваша сфера', accepted.title, node, true);
    if (event) nudgeMotion(event.clientX, event.clientY, 1.4);
    return true;
  }
  function leavePractice(event) {
    if (!practiceScope) return;
    const leaving = practiceScope;
    practiceScope = null;
    const request = {key: leaving.key, handled: false};
    document.dispatchEvent(new CustomEvent('fixar:practice-leave', {detail: request}));
    if (!request.handled) { practiceScope = leaving; sync(); return; }
    cancelAnimations(); overview = true; revealedPracticeKey = leaving.key; sync();
    const node = practiceNodes.find(item => item.getAttribute('data-practice-key') === leaving.key);
    launchPracticeFlight(leaving.title, 'Ваша сфера', node, false);
    if (event) nudgeMotion(event.clientX, event.clientY, 1.4);
  }
  function revealPractice(key) {
    const practice = practiceByKey(key);
    if (!practice) return false;
    cancelAnimations(); practiceScope = null; revealedPracticeKey = key;
    overview = true; sync(); return true;
  }
  function moving() { return loaded && gl && !reduced.matches && !document.hidden; }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; lastDraw = 0; }
  function draw() {
    if (!gl || !loaded) return;
    /* Phone pixels are already dense. Rendering one physical pixel per CSS
       pixel and fewer frames keeps the galaxy fluid without heating the
       device; desktop keeps the sharper 1.5x ceiling. */
    const ratio = mobile.matches ? Math.min(devicePixelRatio || 1, 1) : Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(innerWidth * ratio), h = Math.round(innerHeight * ratio);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(resolutionUniform, w, h);
    gl.uniform2f(viewUniform, yaw + pointerX * .009, pitch - pointerY * .016);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  const frame = safe(now => {
    if (!moving()) { stop(); return; }
    const elapsed = last ? Math.min(now - last, 60) : 16;
    last = now;
    const seconds = now * .001;
    /* Two incommensurate waves continuously bend velocity. Neither axis has
       a privileged direction, while damping keeps every reversal gradual. */
    const targetX = (Math.sin(seconds * .17) + Math.sin(seconds * .071 + 1.7) * .62) * .0000065;
    const targetY = (Math.sin(seconds * .13 + 2.1) + Math.cos(seconds * .049) * .55) * .0000028;
    const driftEase = Math.min(1, elapsed / 2600);
    driftX += (targetX - driftX) * driftEase;
    driftY += (targetY - driftY) * driftEase;
    const pointerEase = Math.min(1, elapsed / 900);
    pointerX += (pointerTargetX - pointerX) * pointerEase;
    pointerY += (pointerTargetY - pointerY) * pointerEase;
    yaw = (yaw + (driftX + impulseX) * elapsed + 1) % 1;
    pitch += (driftY + impulseY) * elapsed;
    if (pitch > .075) { pitch = .075; driftY = -Math.abs(driftY); }
    if (pitch < -.075) { pitch = -.075; driftY = Math.abs(driftY); }
    const damping = Math.exp(-elapsed / 1050);
    impulseX *= damping; impulseY *= damping;
    /* Mobile uses ~20 fps in overview and ~14 fps behind glass. Desktop keeps
       thirty/twenty-four: one visual system, two power budgets. */
    const cadence = mobile.matches ? (overview ? 48 : 72) : (overview ? 32 : 42);
    if (!lastDraw || now - lastDraw >= cadence) { lastDraw = now; draw(); }
    raf = requestAnimationFrame(frame);
  });
  function sync() {
    stop(); draw();
    host.setAttribute('data-fs-shell', panel ? 'working' : 'root');
    host.setAttribute('data-fs-viewport', mobile.matches ? 'mobile' : 'desktop');
    sky.setAttribute('aria-pressed', String(overview));
    sky.setAttribute('aria-expanded', String(overview));
    sky.setAttribute('aria-label', overview ? 'Вернуться к экрану'
      : practiceScope ? 'Обзор кабинета «' + practiceScope.title + '»' : 'Обзор пространства');
    graph.setAttribute('aria-hidden', String(!overview));
    if (loaded) document.body.setAttribute('data-fixar-space', overview ? 'overview' : 'work');
    syncPracticeScope();
    syncGraph(state);
    if (moving()) raf = requestAnimationFrame(frame);
  }
  function toggleOverview(event) {
    nudgeMotion(event.clientX, event.clientY, 2.2);
    overview = !overview;
    if (overview) cancelAnimations();
    sync();
  }
  listen(canvas, 'click', toggleOverview);
  listen(sky, 'keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); toggleOverview(event);
  });
  listen(practiceBack, 'click', leavePractice);
  graphNodes.forEach((node, index) => listen(node, 'click', event => {
    if (!overview || (panel && index !== modeIndex(state))) return;
    nudgeMotion(event.clientX, event.clientY, 1.8);
    if (!panel && index !== modeIndex(state)) {
      /* The document shell owns content and focus; the spatial layer names
         only the destination. Its observer then turns this real state change
         into the same point-to-point flight as every other screen. */
      document.dispatchEvent(new CustomEvent('fixar:navigate-screen', {
        detail:{screen:index === 1 ? 'document' : 'dialog'}
      }));
      return;
    }
    overview = false; sync();
    const surface = document.querySelector(panel ? '.pane.center' : '.dock');
    if (surface && !reduced.matches) animations.push(surface.animate([
      {boxShadow:'0 0 52px rgba(34,207,238,.64)'},
      {boxShadow:'0 24px 90px rgba(0,0,0,.4), inset 0 0 0 1px rgba(96,139,152,.45)'}
    ], {duration:680, easing:'cubic-bezier(.18,.72,.18,1)'}));
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus({preventScroll:true});
    }
  }));
  listen(document, 'fixar:practices-changed', event => applyPracticeSnapshot(event.detail));
  listen(document, 'fixar:practice-reveal', event => {
    const detail = event.detail || {};
    if (revealPractice(String(detail.key || ''))) detail.handled = true;
  });
  listen(document, 'fixar:practice-enter', event => {
    const detail = event.detail || {};
    const practice = practiceByKey(String(detail.key || ''));
    if (practice && enterPractice(practice, null, true)) detail.handled = true;
  });
  listen(document, 'pointermove', event => {
    if (!reduced.matches) trackPointer(event.clientX, event.clientY);
  });
  listen(document, 'focusin', event => {
    if (!host.contains(event.target)) returnFocus = event.target;
  });
  // Any interaction with live UI exits explicit overview. No shell event is cancelled.
  for (const type of ['focusin', 'pointerdown', 'keydown', 'wheel']) {
    listen(document, type, event => {
      if (type === 'pointerdown') nudgeMotion(event.clientX, event.clientY, .7);
      if (overview && (event.key === 'Escape' || !host.contains(event.target))) { overview = false; sync(); }
    });
  }
  listen(document, 'visibilitychange', sync);
  listen(window, 'resize', sync);
  listen(reduced, 'change', () => {
    cancelAnimations(); sync();
  });
  listen(mobile, 'change', () => {
    animations.splice(0).forEach(animation => animation.cancel()); sync();
  });
  listen(canvas, 'webglcontextlost', event => {
    /* Mobile browsers reclaim GPU contexts aggressively. Keep the downloaded
       nebula and the CSS sphere alive there; desktop still fails closed so a
       broken renderer never masquerades as a healthy release. */
    if (!mobile.matches) { fail(); return; }
    event.preventDefault(); stop(); gl = null; canvas.hidden = true;
    host.setAttribute('data-fs-renderer', 'image'); sync();
  });
  const observed = panel || document.body;
  const attribute = panel ? 'hidden' : 'data-fixar-screen';
  let state = observed.getAttribute(attribute);
  syncGraph(state);
  const practiceRequest = {
    handled: false,
    receive: snapshot => applyPracticeSnapshot(snapshot)
  };
  document.dispatchEvent(new CustomEvent('fixar:practices-request', {detail: practiceRequest}));
  observer = new MutationObserver(safe(() => {
    const next = observed.getAttribute(attribute);
    if (next === state) return;
    const previous = state; state = next; overview = false; sync();
    cancelAnimations();
    if (!reduced.matches) {
      launchFlight(previous, next);
    }
  }));
  observer.observe(observed, {attributes:true, attributeFilter:[attribute]});
  if (mapSurface && typeof mapSurface.querySelector === 'function') {
    mapObserver = new MutationObserver(safe(enhanceObjectMap));
    mapObserver.observe(mapSurface, {childList:true});
    enhanceObjectMap();
  }
  image = new Image();
  image.onerror = safe(fail);
  image.onload = safe(() => {
    gl = canvas.getContext('webgl', {alpha:false, antialias:false, depth:false});
    if (gl) {
        function shader(type, source) {
          const object = gl.createShader(type); shaders.push(object);
          gl.shaderSource(object, source); gl.compileShader(object);
          if (!gl.getShaderParameter(object, gl.COMPILE_STATUS)) throw Error('Space shader');
          return object;
        }
        program = gl.createProgram();
        gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 position;varying vec2 uv;void main(){uv=position;gl_Position=vec4(position,0.,1.);}'));
        gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 uv;uniform vec2 resolution;uniform vec2 view;uniform sampler2D sky;void main(){vec3 r=normalize(vec3(uv.x*resolution.x/resolution.y,uv.y,1.25));vec2 p=vec2(fract(atan(r.x,r.z)/6.2831853+view.x),clamp(.5-asin(r.y)/3.14159265+view.y,.002,.998));gl_FragColor=vec4(texture2D(sky,p).rgb,1.);}'));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Space link');
        gl.useProgram(program);
        buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        resolutionUniform = gl.getUniformLocation(program, 'resolution');
        viewUniform = gl.getUniformLocation(program, 'view');
        texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      host.setAttribute('data-fs-renderer', 'webgl');
    } else host.setAttribute('data-fs-renderer', 'image');
    loaded = true; ready(); sync();
  });
  image.src = '/space/nebula.webp';
  sync();
  return dispose;
};
