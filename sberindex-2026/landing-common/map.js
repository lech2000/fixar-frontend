/* Shared, dependency-free SVG map for the two SberIndex research previews.
 * Geometry and factual attributes come from municipal-2021.js, not from UI.
 */
(() => {
  'use strict';

  const data = window.SBER_MUNICIPAL_2021;
  const osmPreview = data?.source_kind === 'osm-boundaries';
  const SVG = 'http://www.w3.org/2000/svg';
  const formatNumber = value => new Intl.NumberFormat('ru-RU').format(value);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const districtColors = ['#40c8bd','#74aaf2','#b49ae9','#f5b56b','#d3dd7b','#e98682','#86c9eb','#d99bca','#a7b6b8'];
  const typeColors = ['#49c4ae','#70a9e9','#e6b76e','#b98bd9','#ed8d88','#9bc76d','#aeb9bd'];
  const populationColors = ['#657c9b','#719ccc','#66c9c3','#d8db8c','#edb371','#e78071'];
  const base = data && Array.isArray(data.features) ? data.features : [];
  const districts = [...new Set(base.map(feature => feature.f || 'Не указан'))].sort((a,b) => a.localeCompare(b,'ru'));
  const types = [...new Set(base.map(feature => feature.t || 'Не указан'))].sort((a,b) => a.localeCompare(b,'ru'));
  const populationBins = [
    {label:'нет данных', test:value => value == null, color:'#52606e'},
    {label:'до 20 тыс.', test:value => value < 20000, color:populationColors[0]},
    {label:'20–50 тыс.', test:value => value < 50000, color:populationColors[1]},
    {label:'50–100 тыс.', test:value => value < 100000, color:populationColors[2]},
    {label:'100–250 тыс.', test:value => value < 250000, color:populationColors[3]},
    {label:'250 тыс. – 1 млн', test:value => value < 1000000, color:populationColors[4]},
    {label:'от 1 млн', test:() => true, color:populationColors[5]}
  ];
  const shortType = name => {
    if (name.startsWith('внутригородская территория')) return 'Внутригородская территория';
    if (name === 'городской округ с внутригородским делением') return 'ГО с внутригородским делением';
    return name;
  };

  function init(root) {
    const svg = root.querySelector('[data-map-svg]');
    const paths = root.querySelector('[data-map-paths]');
    const results = root.querySelector('[data-map-results]');
    const search = root.querySelector('[data-map-search]');
    const detail = root.querySelector('[data-map-detail]');
    const legend = root.querySelector('[data-map-legend]');
    const tooltip = root.querySelector('[data-map-tooltip]');
    const status = root.querySelector('[data-map-status]');
    if (!svg || !paths || !results || !search || !detail || !legend || !tooltip || !status) return;
    if (!base.length) {
      status.textContent = 'Геослой не загружен. Проверьте файл municipal-2021.js.';
      return;
    }

    const all = {x:0, y:0, w:data.width, h:data.height};
    let view = {...all};
    let channel = root.dataset.defaultChannel || 'type';
    let selected = null;
    let activePath = null;
    let dragging = null;
    const elements = [];

    function fill(feature) {
      if (channel === 'district') return districtColors[districts.indexOf(feature.f || 'Не указан') % districtColors.length];
      if (channel === 'population') return populationBins.find(bin => bin.test(feature.p)).color;
      return typeColors[types.indexOf(feature.t || 'Не указан') % typeColors.length];
    }
    function setView(next) {
      const minWidth = all.w / 32;
      const w = Math.max(minWidth, Math.min(all.w, next.w));
      const h = w * all.h / all.w;
      const x = Math.max(all.x, Math.min(all.x + all.w - w, next.x));
      const y = Math.max(all.y, Math.min(all.y + all.h - h, next.y));
      view = {x,y,w,h};
      svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      root.querySelector('[data-zoom-label]').textContent = `${(all.w / w).toFixed(1).replace('.0','')}×`;
    }
    function zoom(factor, centerX = view.x + view.w / 2, centerY = view.y + view.h / 2) {
      const w = view.w / factor;
      const h = view.h / factor;
      setView({x:centerX-(centerX-view.x)*w/view.w, y:centerY-(centerY-view.y)*h/view.h, w,h});
    }
    function point(event) {
      const p = svg.createSVGPoint();
      p.x = event.clientX; p.y = event.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    }
    function showDetail(feature) {
      if (!feature) {
        detail.innerHTML = osmPreview
          ? '<span class="detail-kicker">ВЫБОР ТЕРРИТОРИИ</span><h3>Нажмите на территорию</h3><p>Или найдите её по названию и субъекту. Это обзор границ OpenStreetMap, а не данные СберИндекса.</p>'
          : '<span class="detail-kicker">ВЫБОР ТЕРРИТОРИИ</span><h3>Нажмите на муниципалитет</h3><p>Или найдите его по названию, субъекту либо коду ОКТМО. Профиль исследования появится после проверки соответствия территорий данным СберИндекса.</p>';
        return;
      }
      if (osmPreview) {
        detail.innerHTML = `<span class="detail-kicker">ГРАНИЦЫ OPENSTREETMAP · ЭКСПОРТ 2021</span><h3>${escapeHtml(feature.n)}</h3><p>${escapeHtml(feature.r)} · ${escapeHtml(feature.f)}</p><dl><div><dt>OSM relation</dt><dd>${escapeHtml(feature.o)}</dd></div></dl><p class="detail-caveat">Это обзорный слой OSM 2021 года, не актуальный реестр муниципалитетов. Коды ОКТМО, население и показатели СберИндекса здесь не представлены.</p>`;
        return;
      }
      detail.innerHTML = `<span class="detail-kicker">МУНИЦИПАЛИТЕТ · ГРАНИЦЫ 2021</span><h3>${escapeHtml(feature.n)}</h3><p>${escapeHtml(feature.r)} · ${escapeHtml(feature.f)}</p><dl><div><dt>Тип</dt><dd>${escapeHtml(feature.t || '—')}</dd></div><div><dt>ОКТМО 2021</dt><dd>${escapeHtml(feature.o || '—')}</dd></div><div><dt>Население 2021</dt><dd>${feature.p == null ? 'нет данных' : formatNumber(feature.p)}</dd></div></dl><p class="detail-caveat">Это географический контекст, не кластер и не прогноз. Связь с территориальным ID СберИндекса ещё проверяется.</p>`;
    }
    function select(index, focus = false) {
      if (activePath) activePath.classList.remove('is-selected');
      selected = index;
      const feature = base[index];
      activePath = elements[index];
      activePath.classList.add('is-selected');
      paths.appendChild(activePath);
      showDetail(feature);
      status.textContent = `Выбрано: ${feature.n}, ${feature.r}.`;
      if (focus && feature.b) {
        const [x,y,w,h] = feature.b;
        const targetWidth = Math.max(w * 2.7, h * 2.7 * all.w / all.h, all.w / 22);
        setView({x:x+w/2-targetWidth/2, y:y+h/2-targetWidth*all.h/all.w/2, w:targetWidth});
      }
    }
    function drawLegend() {
      let entries;
      if (channel === 'district') entries = districts.map((name,i) => [name,districtColors[i % districtColors.length]]);
      else if (channel === 'population') entries = populationBins.map(bin => [bin.label,bin.color]);
      else entries = types.map((name,i) => [shortType(name),typeColors[i % typeColors.length]]);
      legend.innerHTML = entries.map(([name,color]) => `<span class="legend-item"><i style="background:${color}"></i>${escapeHtml(name)}</span>`).join('');
      elements.forEach((element,index) => element.setAttribute('fill',fill(base[index])));
      root.querySelectorAll('[data-channel]').forEach(button => {
        const active = button.dataset.channel === channel;
        button.setAttribute('aria-pressed', String(active));
      });
      status.textContent = `Показан слой: ${channel === 'district' ? 'федеральный округ' : channel === 'population' ? 'население 2021' : 'тип муниципального образования'}.`;
    }
    const fragment = document.createDocumentFragment();
    base.forEach((feature,index) => {
      const element = document.createElementNS(SVG,'path');
      element.setAttribute('d',feature.d);
      element.setAttribute('fill-rule','evenodd');
      element.dataset.index = String(index);
      fragment.appendChild(element);
      elements.push(element);
    });
    paths.appendChild(fragment);
    svg.setAttribute('viewBox', `0 0 ${all.w} ${all.h}`);
    showDetail(null);
    drawLegend();

    root.querySelectorAll('[data-channel]').forEach(button => button.addEventListener('click', () => {
      channel = button.dataset.channel;
      drawLegend();
    }));
    root.querySelector('[data-zoom-in]').addEventListener('click', () => zoom(1.55));
    root.querySelector('[data-zoom-out]').addEventListener('click', () => zoom(1/1.55));
    root.querySelector('[data-zoom-reset]').addEventListener('click', () => setView(all));
    svg.addEventListener('wheel', event => {
      event.preventDefault();
      const p = point(event);
      zoom(event.deltaY < 0 ? 1.36 : 1/1.36,p.x,p.y);
    }, {passive:false});
    svg.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      dragging = {id:event.pointerId, x:event.clientX, y:event.clientY, moved:false,
        index:event.target.matches('path[data-index]') ? Number(event.target.dataset.index) : null};
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove', event => {
      if (dragging && dragging.id === event.pointerId) {
        const dx = event.clientX - dragging.x;
        const dy = event.clientY - dragging.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
        if (dragging.moved) {
          const rect = svg.getBoundingClientRect();
          setView({x:view.x-dx*view.w/rect.width,y:view.y-dy*view.h/rect.height,w:view.w});
          dragging.x = event.clientX; dragging.y = event.clientY;
          tooltip.hidden = true;
        }
        return;
      }
      const target = event.target.closest('path[data-index]');
      if (!target) {tooltip.hidden = true; return;}
      const feature = base[Number(target.dataset.index)];
      tooltip.textContent = `${feature.n} · ${feature.r}`;
      tooltip.hidden = false;
      const rect = root.querySelector('[data-map-stage]').getBoundingClientRect();
      tooltip.style.left = `${Math.min(event.clientX-rect.left+14,rect.width-tooltip.offsetWidth-8)}px`;
      tooltip.style.top = `${Math.max(8,event.clientY-rect.top-36)}px`;
    });
    svg.addEventListener('pointerup', event => {
      if (!dragging || dragging.id !== event.pointerId) return;
      const moved = dragging.moved;
      const index = dragging.index;
      dragging = null;
      if (!moved && index != null) select(index);
    });
    svg.addEventListener('pointercancel', () => { dragging = null; });
    svg.addEventListener('pointerleave', () => { tooltip.hidden = true; });
    svg.addEventListener('dblclick', event => { event.preventDefault(); const p=point(event); zoom(1.9,p.x,p.y); });

    function matches(term) {
      if (!term) return [];
      return base.map((feature,index) => ({feature,index})).filter(({feature}) =>
        `${feature.n} ${feature.r} ${feature.o}`.toLocaleLowerCase('ru').includes(term)).slice(0,7);
    }
    function renderResults() {
      const term = search.value.trim().toLocaleLowerCase('ru');
      const hits = matches(term);
      results.hidden = !term;
      results.innerHTML = hits.length ? hits.map(({feature,index}) => `<button type="button" data-result="${index}"><b>${escapeHtml(feature.n)}</b><small>${escapeHtml(feature.r)} · ${escapeHtml(feature.o)}</small></button>`).join('') : '<p>Совпадений нет</p>';
    }
    search.addEventListener('input',renderResults);
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') {results.hidden = true; search.blur();}
      if (event.key === 'Enter') {
        const first = matches(search.value.trim().toLocaleLowerCase('ru'))[0];
        if (first) {event.preventDefault();select(first.index,true);results.hidden=true;search.value=first.feature.n;}
      }
    });
    results.addEventListener('click', event => {
      const button = event.target.closest('[data-result]');
      if (!button) return;
      const index = Number(button.dataset.result);
      select(index,true);
      results.hidden = true;
      search.value = base[index].n;
    });
    document.addEventListener('pointerdown', event => {if (!root.contains(event.target)) results.hidden=true;});
  }

  document.querySelectorAll('[data-map]').forEach(init);
})();
