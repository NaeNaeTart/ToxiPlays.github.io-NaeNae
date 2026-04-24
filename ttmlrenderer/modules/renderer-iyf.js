import { state } from './state.js';
import { getExportQualityProfile, createTextMeasureCache, clearRenderPreview, updateRenderPreview, formatTime, resolveFilename } from './utils.js';

export async function startInYourFaceRender() {
  state.renderCancelled  = false;
  state.renderInProgress = true;
  const overlay    = document.getElementById('render-overlay');
  const barFill    = document.getElementById('render-bar-fill');
  const renderSub  = document.getElementById('render-sub');
  overlay.classList.add('active');
  document.getElementById('btn-render').classList.add('rendering');

  const q = getExportQualityProfile();
  const W = q.width, H = q.height, FPS = q.fps;
  const VIDEO_BPS = q.videoBitsPerSecond;
  const FONT_SIZE     = 100;
  const LINE_SPACING  = 120;
  const CENTER_Y      = H / 2;
  const MAX_W         = W - 160;
  const ADLIB_FADE    = 0.4;
  const LINE_FADE_GAP = 3.0;

  const cs = getComputedStyle(document.documentElement);
  const BG         = cs.getPropertyValue('--bg').trim()          || '#0a0a0f';
  const COL_DIM    = cs.getPropertyValue('--text-dim').trim()    || '#3a3a55';
  const COL_MID    = cs.getPropertyValue('--text-mid').trim()    || '#6a6a9a';
  const COL_BRIGHT = cs.getPropertyValue('--text-bright').trim() || '#c8c8e8';
  const COL_ACTIVE = cs.getPropertyValue('--accent').trim()      || '#e8f440';

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const textCache = createTextMeasureCache(ctx, fs => `bold ${fs}px "DM Mono", monospace`);

  const casing      = document.getElementById('iyf-casing').value;
  const showProgBar = document.getElementById('iyf-show-progress').checked;

  function processText(txt) {
    if (casing === 'lower') return txt.toLowerCase();
    if (casing === 'upper') return txt.toUpperCase();
    return txt;
  }

  function wrapEntry(lineObj) {
    const lineSpans = state.spans.filter(s => s.lineEl === lineObj.el);
    const words = [];
    let i = 0;
    while (i < lineSpans.length) {
      const s = lineSpans[i];
      let txt = s.el.textContent;
      let j = i + 1;
      while (j < lineSpans.length && !/\s$/.test(lineSpans[j - 1].el.textContent)) {
        txt += lineSpans[j].el.textContent;
        j++;
      }
      words.push({ text: processText(txt), begin: s.begin, end: lineSpans[j - 1].end });
      i = j;
    }
    const rows = []; let curRow = []; let curW = 0;
    for (const w of words) {
      const ww = textCache.width(FONT_SIZE, w.text);
      if (curW + ww > MAX_W && curRow.length > 0) {
        rows.push({ words: curRow, width: curW });
        curRow = []; curW = 0;
      }
      curRow.push({ ...w, width: ww });
      curW += ww;
    }
    if (curRow.length) rows.push({ words: curRow, width: curW });
    return { lineBegin: lineObj.begin, lineEnd: lineObj.end, rows };
  }

  const allEntries = state.lines.map(l => wrapEntry(l));
  const nonAdlibs  = [];
  const adlibs     = [];
  state.lines.forEach((l, idx) => {
    const entry = allEntries[idx];
    if (l.el.classList.contains('adlib')) adlibs.push(entry);
    else nonAdlibs.push(entry);
  });

  const gapAfter = nonAdlibs.map((curr, idx) => {
    const next = nonAdlibs[idx + 1];
    if (!next) return null;
    const dur = next.lineBegin - curr.lineEnd;
    return { start: curr.lineEnd, end: next.lineBegin, duration: dur };
  });

  const lastSpanEnd = state.spans.length ? Math.max(...state.spans.map(s => s.end)) : state.duration;
  const creditEl    = document.querySelector('.songwriter-credit');
  const creditText  = creditEl ? creditEl.textContent : null;
  const CREDIT_DUR  = 3.0;

  function drawCredits(t) {
    if (!creditText || t < lastSpanEnd + 0.5) return;
    const alpha = Math.min(1, (t - (lastSpanEnd + 0.5)) / 0.8);
    ctx.globalAlpha = alpha * 0.8;
    ctx.font = `bold 32px "DM Mono", monospace`;
    ctx.fillStyle = COL_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText(processText(creditText), W / 2, CENTER_Y);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  function drawLine(entry, y, alpha, type) {
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${FONT_SIZE}px "DM Mono", monospace`;
    ctx.textBaseline = 'middle';
    let rowY = y - ((entry.rows.length - 1) * LINE_SPACING) / 2;
    for (const row of entry.rows) {
      let x = W / 2 - row.width / 2;
      for (const w of row.words) {
        ctx.fillStyle = (type === 'active' && _t >= w.begin && _t < w.end) ? COL_ACTIVE : (type === 'adlib' ? COL_MID : COL_BRIGHT);
        ctx.fillText(w.text, x, rowY);
        x += w.width;
      }
      rowY += LINE_SPACING;
    }
  }

  const EASE_DUR = 0.4;
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

  let _t = 0;
  let transitionStart = -1;
  let lastNAPos = -1;
  let bleedLine = null;

  function getAdlibsAt(t) { return adlibs.filter(a => t >= a.lineBegin && t < a.lineEnd); }

  function drawFrame_iyf(t) {
    _t = t;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    let lyricAlpha = 1;
    if (creditText && t >= lastSpanEnd + 0.5) lyricAlpha = Math.max(0, 1 - (t - (lastSpanEnd + 0.5)) / 0.5);

    let naPos = -1;
    for (let i = 0; i < nonAdlibs.length; i++) {
      if (t >= nonAdlibs[i].lineBegin && t < nonAdlibs[i].lineEnd) { naPos = i; break; }
    }
    if (naPos === -1) {
      for (let i = 0; i < nonAdlibs.length; i++) {
        if (t < nonAdlibs[i].lineBegin) break;
        naPos = i;
      }
    }

    if (naPos !== lastNAPos) {
      if (lastNAPos >= 0) {
        const prev = nonAdlibs[lastNAPos];
        bleedLine = (t < prev.lineEnd) ? prev : null;
      } else {
        bleedLine = null;
      }
      transitionStart = t;
      lastNAPos = naPos;
    }

    if (bleedLine && t >= bleedLine.lineEnd) bleedLine = null;

    const transAge = transitionStart >= 0 ? Math.min(1, (t - transitionStart) / EASE_DUR) : 1;
    const eased    = easeOut(transAge);

    if (naPos >= 0 && lyricAlpha > 0) {
      const curLine  = nonAdlibs[naPos];
      const curY     = CENTER_Y + LINE_SPACING * (1 - eased);

      let curAlpha = Math.max(0.05, eased) * lyricAlpha;
      if (t >= curLine.lineEnd) {
        const gap = gapAfter[naPos];
        if (gap && gap.duration >= LINE_FADE_GAP) {
          const fadeProgress = (t - curLine.lineEnd) / Math.min(0.6, gap.duration * 0.15);
          curAlpha = Math.max(0, 1 - fadeProgress) * lyricAlpha;
        }
      }

      if (bleedLine) {
        const prevY     = CENTER_Y - LINE_SPACING * eased;
        const bleedAge  = Math.max(0, (t - bleedLine.lineBegin) / Math.max(bleedLine.lineEnd - bleedLine.lineBegin, 0.001));
        const prevAlpha = Math.max(0, 0.6 * (1 - bleedAge)) * lyricAlpha;
        if (prevAlpha > 0) drawLine(bleedLine, prevY, prevAlpha, 'active');
      }

      if (curAlpha > 0) drawLine(curLine, curY, curAlpha, 'active');

      const activeAdlibs = getAdlibsAt(t);
      if (activeAdlibs.length > 0) {
        const al      = activeAdlibs[0];
        const fadeIn  = Math.min(1, (t - al.lineBegin) / ADLIB_FADE);
        const fadeOut = Math.min(1, (al.lineEnd - t)   / ADLIB_FADE);
        const alAlpha = Math.min(fadeIn, fadeOut) * 0.8 * lyricAlpha;
        if (alAlpha > 0) drawLine(al, CENTER_Y + LINE_SPACING, alAlpha, 'adlib');
      }
    }

    const fadeH = 90;
    const topFade = ctx.createLinearGradient(0, CENTER_Y - LINE_SPACING - fadeH, 0, CENTER_Y - LINE_SPACING + 30);
    topFade.addColorStop(0, BG); topFade.addColorStop(1, 'rgba(0,0,0,0)');
    const botFade = ctx.createLinearGradient(0, CENTER_Y + LINE_SPACING - 30, 0, CENTER_Y + LINE_SPACING + fadeH);
    botFade.addColorStop(0, 'rgba(0,0,0,0)'); botFade.addColorStop(1, BG);
    ctx.fillStyle = topFade; ctx.fillRect(0, 0, W, CENTER_Y);
    ctx.fillStyle = botFade; ctx.fillRect(0, CENTER_Y, W, H - CENTER_Y);

    const BAR_H = 4, BAR_Y = H - 36, BAR_PAD = 80, barW = W - BAR_PAD * 2;
    if (showProgBar && state.duration > 0) {
      ctx.globalAlpha = 0.3; ctx.fillStyle = COL_MID; ctx.fillRect(BAR_PAD, BAR_Y, barW, BAR_H);
      ctx.globalAlpha = 1;   ctx.fillStyle = COL_ACTIVE; ctx.fillRect(BAR_PAD, BAR_Y, barW * Math.min(t / state.duration, 1), BAR_H);
    } else if (naPos >= 0) {
      const gap = gapAfter[naPos];
      if (gap && t >= gap.start && t < gap.end) {
        const gapProgress = (t - gap.start) / gap.duration;
        ctx.globalAlpha = 0.3; ctx.fillStyle = COL_MID; ctx.fillRect(BAR_PAD, BAR_Y, barW, BAR_H);
        ctx.globalAlpha = 1;   ctx.fillStyle = COL_ACTIVE; ctx.fillRect(BAR_PAD, BAR_Y, barW * gapProgress, BAR_H);
        ctx.globalAlpha = 1;
      }
    }
    drawCredits(t);
  }

  clearRenderPreview();
  const canvasStream = canvas.captureStream(FPS);
  const renderACtx   = new AudioContext();
  const dest         = renderACtx.createMediaStreamDestination();
  const audioSrc     = renderACtx.createBufferSource();
  audioSrc.buffer    = state.audioBuffer;
  audioSrc.connect(dest);
  const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mimeTypes = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const mimeType  = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const recorder  = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: VIDEO_BPS });
  const chunks    = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  state.stableRecorder = recorder;
  state.stableAudioCtx = renderACtx;

  recorder.start(100);
  audioSrc.start(0);
  state.startTime = Date.now();
  document.querySelector(".render-title").textContent = "Rendering";
  const audioStartTime = renderACtx.currentTime;

  let renderDone   = false;
  let iyfRafId     = null;
  let lastDrawTime = -1;
  const FRAME_MS   = 1000 / FPS;

  function doIYFTick(wallMs) {
    if (state.renderCancelled || renderDone) return;
    if (wallMs - lastDrawTime < FRAME_MS - 1) { iyfRafId = requestAnimationFrame(doIYFTick); return; }
    lastDrawTime = wallMs;
    const t = Math.max(renderACtx.currentTime - audioStartTime, 0);
    const endAt = Math.max(state.duration + 1.5, creditText ? lastSpanEnd + CREDIT_DUR + 2.5 : 0);
    if (t > endAt) {
      renderDone = true;
      try { audioSrc.stop(); } catch(_) {}
      recorder.stop();
      return;
    }
    drawFrame_iyf(t);
    updateRenderPreview(canvas);
    const pct = Math.min(t / (state.duration + 1) * 100, 100);
    barFill.style.width = pct.toFixed(1) + '%';
    renderSub.textContent = formatTime(t) + ' / ' + formatTime(state.duration);
    iyfRafId = requestAnimationFrame(doIYFTick);
  }
  iyfRafId = requestAnimationFrame(doIYFTick);

  recorder.onstop = () => {
    if (iyfRafId) cancelAnimationFrame(iyfRafId);
    state.stableRecorder = null;
    state.stableAudioCtx = null;
    state.renderInProgress = false;
    if (!state.renderCancelled) {
      document.querySelector('.render-title').textContent = "Patching";
      let duration = Date.now() - state.startTime;
      const initBlob = new Blob(chunks, { type: mimeType });
      window.ysFixWebmDuration(initBlob, duration, blob => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = resolveFilename('iyf'); a.click();
        overlay.classList.remove('active');
        document.getElementById('btn-render').classList.remove('rendering');
        state.startTime = null;
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      });
    }
  };
}
