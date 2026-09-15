/* Adaptive spatial enhancement. No shell imports, auth access or API calls. */
(() => {
  'use strict';
  let enabled = true;
  try {
    const url = new URL(location.href);
    const values = url.searchParams.getAll('fixar_space');
    if (values.length) {
      enabled = values.every(value => value === '1');
      url.searchParams.delete('fixar_space');
      history.replaceState(history.state, '', url);
    }
  } catch (_) { return; }
  if (!enabled) return;

  let stopped = false, dispose, timer;
  const nodes = [];
  let previousFocus = document.activeElement;
  const host = document.createElement('div');
  host.id = 'fixar-space';
  function disable() {
    if (stopped) return;
    stopped = true;
    const restoreFocus = host.contains(document.activeElement);
    clearTimeout(timer);
    try { if (dispose) dispose(); } catch (_) {}
    nodes.forEach(node => node.remove());
    host.remove();
    delete window.FixarSpaceMount;
    document.body.removeAttribute('data-fixar-space');
    document.body.removeAttribute('data-fs-scope');
    window.removeEventListener('error', onError, true);
    document.removeEventListener('focusin', rememberFocus);
    if (restoreFocus && previousFocus && previousFocus.isConnected) previousFocus.focus({preventScroll: true});
  }
  function onError(event) {
    if ((event.filename || '').includes('/space/') || nodes.includes(event.target)) disable();
  }
  function rememberFocus(event) {
    if (!host.contains(event.target)) previousFocus = event.target;
  }
  try {
    document.body.append(host);
    window.addEventListener('error', onError, true);
    document.addEventListener('focusin', rememberFocus);
    /* A phone on a slow radio still deserves the static glass sphere. The
       runtime has its own image/WebGL fallback, so the watchdog guards only
       a genuinely stalled optional load, not a desktop-class deadline. */
    timer = setTimeout(disable, 12000);
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/space/space.css';
    const script = document.createElement('script');
    script.src = '/space/runtime.js';
    nodes.push(css, script);
    css.onerror = script.onerror = disable;
    css.onload = () => {
      if (stopped) return;
      script.onload = () => {
        if (stopped) { delete window.FixarSpaceMount; return; }
        try {
          const mount = window.FixarSpaceMount;
          delete window.FixarSpaceMount;
          dispose = mount(host, disable, () => {
            if (stopped) return;
            clearTimeout(timer);
            document.body.setAttribute('data-fixar-space', 'work');
          }, cleanup => { dispose = cleanup; });
          // A synchronous failure can disable before mount returns its disposer.
          if (stopped && dispose) dispose();
        } catch (_) { disable(); }
      };
      document.head.append(script);
    };
    document.head.append(css);
  } catch (_) { disable(); }
})();
