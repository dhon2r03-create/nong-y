(function () {
  const statTotal = document.getElementById('statTotal');
  const statSick = document.getElementById('statSick');
  const statHealthy = document.getElementById('statHealthy');
  const byPlantChart = document.getElementById('byPlantChart');
  const byDiseaseChart = document.getElementById('byDiseaseChart');
  const caseList = document.getElementById('caseList');

  // Timeline DOM elements
  const timelineCanvas = document.getElementById('timelineChartCanvas');
  const chartEmptyOverlay = document.getElementById('chartEmptyOverlay');
  const chartTooltip = document.getElementById('chartTooltip');
  const timelineTabs = document.querySelectorAll('.timeline-tab');
  const toggleSickBtn = document.getElementById('toggleSickBtn');
  const toggleHealthyBtn = document.getElementById('toggleHealthyBtn');

  // Metrics DOM elements
  const metricTotal = document.getElementById('metricTotal');
  const metricSick = document.getElementById('metricSick');
  const metricHealthy = document.getElementById('metricHealthy');
  const metricPeak = document.getElementById('metricPeak');

  // Timeline state
  let chartInstance = null;
  let currentRange = '7d';
  let showSick = true;
  let showHealthy = true;
  let cachedStats = null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function renderBarList(container, items, labelKey, countKey) {
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="empty-state">Chưa có dữ liệu</div>';
      return;
    }
    const max = Math.max(...items.map((it) => it[countKey]));
    container.innerHTML = items
      .map((it) => {
        const pct = max > 0 ? Math.round((it[countKey] / max) * 100) : 0;
        return `
          <div class="bar-row">
            <div class="bar-label" title="${escapeHtml(it[labelKey])}">${escapeHtml(it[labelKey])}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div>
            <div class="bar-count">${it[countKey]}</div>
          </div>`;
      })
      .join('');
  }

  // -------------------------------------------------------------------------
  // TIMELINE DATA PROCESSING
  // -------------------------------------------------------------------------
  function getTimelineData(stats, range) {
    const byDateList = stats.by_date || [];
    const byHourList = stats.by_hour_today || [];

    const dateMap = new Map();
    byDateList.forEach((item) => {
      dateMap.set(item.date, item);
    });

    if (range === 'today') {
      const hourMap = new Map();
      byHourList.forEach((item) => {
        hourMap.set(item.hour, item);
      });

      const labels = [];
      const fullLabels = [];
      const sickData = [];
      const healthyData = [];
      const totalData = [];

      for (let h = 0; h < 24; h++) {
        const hStr = `${String(h).padStart(2, '0')}:00`;
        labels.push(hStr);
        fullLabels.push(`Hôm nay lúc ${hStr}`);
        const item = hourMap.get(hStr) || { count: 0, sick: 0, healthy: 0 };
        sickData.push(item.sick || 0);
        healthyData.push(item.healthy || 0);
        totalData.push(item.count || 0);
      }

      return { labels, fullLabels, sickData, healthyData, totalData, isHourly: true };
    }

    let numDays = 7;
    if (range === '14d') numDays = 14;
    else if (range === '30d') numDays = 30;

    // Determine anchor date (latest date in database or today)
    let anchorDate = new Date();
    if (byDateList.length > 0) {
      const latestStr = byDateList[byDateList.length - 1].date;
      if (latestStr) {
        const parts = latestStr.split('-').map(Number);
        const ld = new Date(parts[0], parts[1] - 1, parts[2]);
        if (ld > anchorDate) {
          anchorDate = ld;
        }
      }
    }

    const labels = [];
    const fullLabels = [];
    const sickData = [];
    const healthyData = [];
    const totalData = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const isoDate = `${yStr}-${mStr}-${dStr}`;

      const isToday = i === 0;
      const displayLabel = isToday ? 'Hôm nay' : `${dStr}/${mStr}`;
      labels.push(displayLabel);
      fullLabels.push(`Ngày ${dStr}/${mStr}/${yStr}${isToday ? ' (Hôm nay)' : ''}`);

      const item = dateMap.get(isoDate) || { count: 0, sick: 0, healthy: 0 };
      sickData.push(item.sick || 0);
      healthyData.push(item.healthy || 0);
      totalData.push(item.count || 0);
    }

    return { labels, fullLabels, sickData, healthyData, totalData, isHourly: false };
  }

  function updateMetrics(data) {
    const total = data.totalData.reduce((a, b) => a + b, 0);
    const sick = data.sickData.reduce((a, b) => a + b, 0);
    const healthy = data.healthyData.reduce((a, b) => a + b, 0);

    let maxVal = -1;
    let peakLabel = '--';
    for (let i = 0; i < data.totalData.length; i++) {
      if (data.totalData[i] > maxVal) {
        maxVal = data.totalData[i];
        peakLabel = `${data.labels[i]} (${maxVal} ca)`;
      }
    }
    if (maxVal <= 0) {
      peakLabel = '0 ca';
    }

    if (metricTotal) metricTotal.textContent = `${total} ca`;
    if (metricSick) metricSick.textContent = `${sick} ca`;
    if (metricHealthy) metricHealthy.textContent = `${healthy} ca`;
    if (metricPeak) metricPeak.textContent = peakLabel;

    if (chartEmptyOverlay) {
      chartEmptyOverlay.style.display = total === 0 ? 'flex' : 'none';
    }
  }

  // -------------------------------------------------------------------------
  // CANVAS FALLBACK RENDERER (IF CHART.JS IS OFFLINE)
  // -------------------------------------------------------------------------
  function renderTimelineFallback(canvas, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || canvas.parentElement.clientWidth || 600;
    const h = rect.height || 260;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padLeft = 36;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 32;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const maxVal = Math.max(5, ...data.totalData, ...data.sickData, ...data.healthyData);
    const numYSteps = 4;
    const stepVal = Math.ceil(maxVal / numYSteps);
    const yMax = Math.max(4, stepVal * numYSteps);

    // Draw horizontal grid lines and Y labels
    ctx.font = '11px Plus Jakarta Sans, Be Vietnam Pro, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#64748b';

    for (let i = 0; i <= numYSteps; i++) {
      const val = (yMax / numYSteps) * i;
      const y = padTop + plotH - (val / yMax) * plotH;

      ctx.beginPath();
      ctx.strokeStyle = i === 0 ? '#cbd5e1' : 'rgba(226, 232, 240, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash(i === 0 ? [] : [4, 4]);
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillText(String(Math.round(val)), padLeft - 8, y);
    }

    const n = data.labels.length;
    const stepX = n > 1 ? plotW / (n - 1) : plotW / 2;

    const getX = (i) => (n > 1 ? padLeft + i * stepX : padLeft + plotW / 2);
    const getY = (val) => padTop + plotH - (val / yMax) * plotH;

    // Draw X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Be Vietnam Pro, sans-serif';

    const skipInterval = n > 16 ? Math.ceil(n / 8) : 1;
    data.labels.forEach((lbl, i) => {
      if (i % skipInterval === 0 || i === n - 1) {
        const x = getX(i);
        ctx.textAlign = i === 0 ? 'left' : i === n - 1 ? 'right' : 'center';
        ctx.fillText(lbl, x, h - padBottom + 10);
      }
    });

    function drawSeries(values, strokeColor, fillColor) {
      if (values.length === 0) return;

      // Fill area
      ctx.save();
      const fillPath = new Path2D();
      values.forEach((v, i) => {
        const x = getX(i);
        const y = getY(v);
        if (i === 0) fillPath.moveTo(x, y);
        else fillPath.lineTo(x, y);
      });
      fillPath.lineTo(getX(values.length - 1), padTop + plotH);
      fillPath.lineTo(getX(0), padTop + plotH);
      fillPath.closePath();

      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
      grad.addColorStop(0, fillColor);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fill(fillPath);
      ctx.restore();

      // Stroke line
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = getX(i);
        const y = getY(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Point dots
      values.forEach((v, i) => {
        const x = getX(i);
        const y = getY(v);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      });
    }

    if (showSick) {
      drawSeries(data.sickData, '#f59e0b', 'rgba(245, 158, 11, 0.22)');
    }
    if (showHealthy) {
      drawSeries(data.healthyData, '#10b981', 'rgba(16, 185, 129, 0.22)');
    }

    // Hover tooltip
    canvas.onmousemove = (e) => {
      const r = canvas.getBoundingClientRect();
      const mouseX = e.clientX - r.left;
      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < n; i++) {
        const dist = Math.abs(getX(i) - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      if (chartTooltip) {
        chartTooltip.style.display = 'block';
        chartTooltip.style.left = `${getX(closestIdx)}px`;
        const topY = Math.min(getY(data.sickData[closestIdx]), getY(data.healthyData[closestIdx]));
        chartTooltip.style.top = `${Math.max(20, topY - 12)}px`;
        chartTooltip.innerHTML = `
          <div class="chart-tooltip-title">${escapeHtml(data.fullLabels[closestIdx])}</div>
          <div class="chart-tooltip-row"><span style="color:#f59e0b">● Ca bệnh:</span> <strong>${data.sickData[closestIdx]} ca</strong></div>
          <div class="chart-tooltip-row"><span style="color:#10b981">● Cây khỏe:</span> <strong>${data.healthyData[closestIdx]} ca</strong></div>
          <div class="chart-tooltip-row" style="border-top:1px solid rgba(255,255,255,0.15);padding-top:4px;margin-top:4px"><span>Tổng cộng:</span> <strong>${data.totalData[closestIdx]} ca</strong></div>
        `;
      }
    };

    canvas.onmouseleave = () => {
      if (chartTooltip) chartTooltip.style.display = 'none';
    };
  }

  // -------------------------------------------------------------------------
  // TIMELINE MAIN RENDERER
  // -------------------------------------------------------------------------
  function renderTimelineChart(range) {
    if (!cachedStats) return;
    const data = getTimelineData(cachedStats, range);
    updateMetrics(data);

    if (!timelineCanvas) return;

    if (window.Chart) {
      if (chartInstance) {
        chartInstance.destroy();
      }

      const ctx = timelineCanvas.getContext('2d');

      const gradSick = ctx.createLinearGradient(0, 0, 0, 240);
      gradSick.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
      gradSick.addColorStop(1, 'rgba(245, 158, 11, 0.00)');

      const gradHealthy = ctx.createLinearGradient(0, 0, 0, 240);
      gradHealthy.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
      gradHealthy.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            {
              label: 'Ca nhiễm bệnh',
              data: data.sickData,
              borderColor: '#f59e0b',
              backgroundColor: gradSick,
              borderWidth: 2.5,
              tension: 0.35,
              fill: true,
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4.5,
              pointHoverRadius: 7,
              hidden: !showSick,
            },
            {
              label: 'Cây khỏe mạnh',
              data: data.healthyData,
              borderColor: '#10b981',
              backgroundColor: gradHealthy,
              borderWidth: 2.5,
              tension: 0.35,
              fill: true,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4.5,
              pointHoverRadius: 7,
              hidden: !showHealthy,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 400,
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.94)',
              titleColor: '#f8fafc',
              titleFont: { family: 'Be Vietnam Pro', size: 12.5, weight: '700' },
              bodyColor: '#e2e8f0',
              bodyFont: { family: 'Be Vietnam Pro', size: 12 },
              padding: 12,
              cornerRadius: 8,
              boxPadding: 6,
              callbacks: {
                title: (items) => {
                  const idx = items[0].dataIndex;
                  return data.fullLabels[idx] || items[0].label;
                },
                afterBody: (items) => {
                  const idx = items[0].dataIndex;
                  return `\nTổng cộng: ${data.totalData[idx]} ca`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#64748b',
                font: { family: 'Be Vietnam Pro', size: 11, weight: '500' },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: range === 'today' ? 12 : 14,
              },
            },
            y: {
              beginAtZero: true,
              suggestedMax: Math.max(5, ...data.totalData) + 1,
              grid: {
                color: 'rgba(226, 232, 240, 0.7)',
                drawBorder: false,
              },
              ticks: {
                precision: 0,
                color: '#64748b',
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                padding: 8,
              },
            },
          },
        },
      });
    } else {
      renderTimelineFallback(timelineCanvas, data);
    }
  }

  function initTimelineEvents() {
    timelineTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        timelineTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentRange = tab.getAttribute('data-range') || '7d';
        renderTimelineChart(currentRange);
      });
    });

    if (toggleSickBtn) {
      toggleSickBtn.addEventListener('click', () => {
        showSick = !showSick;
        toggleSickBtn.classList.toggle('disabled', !showSick);
        renderTimelineChart(currentRange);
      });
    }

    if (toggleHealthyBtn) {
      toggleHealthyBtn.addEventListener('click', () => {
        showHealthy = !showHealthy;
        toggleHealthyBtn.classList.toggle('disabled', !showHealthy);
        renderTimelineChart(currentRange);
      });
    }

    window.addEventListener('resize', () => {
      if (!window.Chart && cachedStats) {
        renderTimelineFallback(timelineCanvas, getTimelineData(cachedStats, currentRange));
      }
    });
  }

  // -------------------------------------------------------------------------
  // CASE LIST & DASHBOARD LOAD
  // -------------------------------------------------------------------------

  function renderCaseList(cases) {
    if (!cases || cases.length === 0) {
      caseList.innerHTML = '<li><div class="empty-state">Chưa có dữ liệu</div></li>';
      return;
    }
    caseList.innerHTML = cases
      .slice(0, 20)
      .map((c) => {
        const date = c.created_at ? new Date(c.created_at) : null;
        const dateStr = date
          ? date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '';
        return `
          <li>
            <img class="case-thumb" src="${c.image_url}" alt="" onerror="this.style.visibility='hidden'" />
            <div class="case-info">
              <div class="case-disease">${escapeHtml(c.disease_name)} · ${escapeHtml(c.plant_name)}</div>
              <div class="case-meta">${dateStr}</div>
            </div>
            <div class="case-confidence">${c.confidence}%</div>
          </li>`;
      })
      .join('');
  }

  async function loadDashboard() {
    try {
      const [statsRes, casesRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/cases?limit=20'),
      ]);
      const stats = await statsRes.json();
      const cases = await casesRes.json();

      statTotal.textContent = stats.total_cases;
      statSick.textContent = stats.sick_count;
      statHealthy.textContent = stats.healthy_count;

      renderBarList(byPlantChart, stats.by_plant, 'plant_name', 'count');
      renderBarList(byDiseaseChart, stats.by_disease, 'disease_name', 'count');
      cachedStats = stats;
      renderTimelineChart(currentRange);
      renderCaseList(cases);
    } catch (err) {
      console.error('Không thể tải dữ liệu dashboard', err);
    }
  initTimelineEvents();
  loadDashboard();
})();

