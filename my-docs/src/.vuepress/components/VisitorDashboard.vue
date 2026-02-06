<template>
  <!-- 
    关键改动：
    使用 v-if="isMounted" 作为最终的防御措施。
    这确保了在服务端渲染(SSR)期间，这个组件的内部内容完全不会被渲染，
    从而避免了在 Node.js 环境中调用浏览器专用 API 或加载不兼容的库。
  -->
  <div v-if="isMounted" class="visitor-dashboard-final">
    <!-- 顶部 Header -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="main-title">数据洞察中心</h2>
        <span class="subtitle">实时访客分析系统</span>
      </div>
      <div class="header-right">
        <div class="time-filter">
          <span class="filter-icon">📅</span>
          <select v-model="timeRange" @change="onTimeRangeChange">
            <option value="24h">过去 24 小时</option>
            <option value="7d">过去 7 天</option>
            <option value="30d">过去 30 天</option>
            <option value="all">全部历史</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 核心指标卡片 (KPI) -->
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <div class="kpi-icon">👁️</div>
        <div class="kpi-content">
          <div class="kpi-label">总访问量 (PV)</div>
          <div class="kpi-value">{{ totalPV }}</div>
        </div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-icon">👤</div>
        <div class="kpi-content">
          <div class="kpi-label">独立访客 (UV)</div>
          <div class="kpi-value">{{ totalUV }}</div>
        </div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-icon">📄</div>
        <div class="kpi-content">
          <div class="kpi-label">受访页面数</div>
          <div class="kpi-value">{{ uniquePages }}</div>
        </div>
      </div>
      <div class="kpi-card orange">
        <div class="kpi-chart-mini" id="gauge-chart"></div>
        <div class="kpi-label-overlay">转化率</div>
      </div>
    </div>

    <!-- 主图表区域 -->
    <div class="main-grid">
      <div class="grid-col-left">
        <div class="chart-card">
          <div class="card-header"><h3>📈 流量趋势分析</h3></div>
          <div id="trend-chart" class="chart-body"></div>
        </div>
        <div class="chart-card">
          <div class="card-header"><h3>💻 访客设备与浏览器构成</h3></div>
          <div id="device-chart" class="chart-body"></div>
        </div>
      </div>
      <div class="grid-col-right">
        <div class="chart-card ranking-card">
          <div class="card-header"><h3>🏆 页面访问量排行</h3></div>
          <div class="ranking-list">
            <div v-if="topPages.length === 0" class="empty-state">暂无数据</div>
            <div v-else v-for="(item, index) in topPages" :key="index" class="ranking-item">
              <div class="rank-badge" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              <div class="rank-info">
                <div class="rank-name" :title="getPageTitle(item.name)">{{ getPageTitle(item.name) }}</div>
                <div class="rank-bar-bg">
                  <div class="rank-bar-fill" :style="{ width: (item.value / (topPages[0]?.value || 1) * 100) + '%' }"></div>
                </div>
              </div>
              <div class="rank-val">{{ item.value }}</div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-header"><h3>☁️ 页面访问热点</h3></div>
          <div id="wordcloud-chart" class="chart-body-sm"></div>
        </div>
      </div>
    </div>
    <div class="chart-card">
      <div class="card-header"><h3>📅 访问活跃度日历</h3></div>
      <div id="calendar-chart" class="chart-body-sm"></div>
    </div>
  </div>
  <div v-else>
    <!-- 在服务端渲染或客户端尚未挂载时，显示一个简单的占位符 -->
    <div class="loading-placeholder">正在加载数据看板...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';

// SSR 安全：只有在 onMounted 后才动态导入 echarts
let echarts: any = null;

// 新增：控制客户端渲染的状态
const isMounted = ref(false);

interface VisitorRecord {
  time: string; ip: string; path: string; browser: string; os: string;
}

const LOCAL_KEY = 'v_dashboard_data_real';
const timeRange = ref('30d');
const allRecords = ref<VisitorRecord[]>([]);
const viewRecords = ref<VisitorRecord[]>([]);
let chartInstances: any[] = [];

const pageTitleMap: Record<string, string> = {
  '/': '首页', '/about': '关于我们', '/contact': '联系方式',
  '/guide': '使用指南', '/api': 'API 文档', '/visitor-dashboard.html': '数据看板'
};
const getPageTitle = (path: string): string => pageTitleMap[path] || path;

// SSR 安全的函数
const getDeviceInfo = () => {
  if (typeof navigator === 'undefined') return { browser: 'N/A', os: 'N/A' };
  const ua = navigator.userAgent;
  let browser = 'Other';
  if (/Edg/i.test(ua)) browser = "Edge"; else if (/Chrome/i.test(ua)) browser = "Chrome"; else if (/Firefox/i.test(ua)) browser = "Firefox"; else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  let os = 'Other';
  if (/Windows/i.test(ua)) os = "Windows"; else if (/Macintosh|Mac OS X/i.test(ua)) os = "MacOS"; else if (/Android/i.test(ua)) os = "Android"; else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  return { browser, os };
};

const seedInitialData = () => {
  const mockData: VisitorRecord[] = [];
  const now = new Date();
  const paths = ['/', '/guide', '/about', '/api', '/contact'];
  for (let i = 0; i < 150; i++) {
    const randomTime = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    mockData.push({ time: randomTime.toISOString(), ip: `192.168.1.${i}`, path: paths[i % 5], browser: 'Chrome', os: 'Windows' });
  }
  return mockData;
};

const recordCurrentVisit = async () => {
  if (typeof localStorage === 'undefined' || typeof window === 'undefined') return;
  
  let records: VisitorRecord[] = [];
  try {
    const str = localStorage.getItem(LOCAL_KEY);
    records = str ? JSON.parse(str) : seedInitialData();
  } catch (e) { records = seedInitialData(); }

  const device = getDeviceInfo();
  let ip = '127.0.0.1';
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) ip = (await res.json()).ip;
  } catch (e) { /* ignore */ }

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  records.push({ time: new Date().toISOString(), ip, path: currentPath, ...device });
  if (records.length > 2000) records = records.slice(-2000);
  
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
  allRecords.value = records;
};

const filterData = () => {
  const now = new Date();
  let start = new Date(0);
  if (timeRange.value === '24h') start = new Date(now.getTime() - 24 * 3600 * 1000);
  else if (timeRange.value === '7d') start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  else if (timeRange.value === '30d') start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  viewRecords.value = allRecords.value.filter(r => new Date(r.time) >= start);
};

const totalPV = computed(() => viewRecords.value.length);
const totalUV = computed(() => new Set(viewRecords.value.map(r => r.ip)).size);
const uniquePages = computed(() => new Set(viewRecords.value.map(r => r.path)).size);
const conversionRate = computed(() => totalPV.value === 0 ? 0 : Math.round((totalUV.value / totalPV.value) * 100));
const topPages = computed(() => {
  const counts: Record<string, number> = {};
  viewRecords.value.forEach(r => { counts[r.path] = (counts[r.path] || 0) + 1; });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
});

const initCharts = () => {
  if (!echarts) return;
  chartInstances.forEach(chart => chart.dispose());
  chartInstances = [];
  
  const createChart = (elId: string, option: any) => {
    const el = document.getElementById(elId);
    if (el) { const chart = echarts.init(el); chart.setOption(option); chartInstances.push(chart); }
  };

  createChart('gauge-chart', {
    series: [{
      type: 'gauge', startAngle: 180, endAngle: 0, min: 0, max: 100, splitNumber: 1,
      axisLine: { lineStyle: { width: 8, color: [[1, '#FF9F43']] } },
      pointer: { length: '50%', width: 4, offsetCenter: [0, '-20%'] },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      detail: { fontSize: 16, offsetCenter: [0, '20%'], formatter: '{value}%', color: 'auto' },
      data: [{ value: conversionRate.value }]
    }]
  });

  const dateCount: Record<string, number> = {};
  viewRecords.value.forEach(r => { const k = timeRange.value === '24h' ? new Date(r.time).getHours().toString().padStart(2, '0') + ':00' : r.time.split('T')[0]; dateCount[k] = (dateCount[k] || 0) + 1; });
  const keys = Object.keys(dateCount).sort();
  createChart('trend-chart', { tooltip: { trigger: 'axis' }, grid: { top: 30, right: 20, bottom: 20, left: 40, containLabel: true }, xAxis: { type: 'category', data: keys, boundaryGap: false }, yAxis: { type: 'value' }, series: [{ data: keys.map(k => dateCount[k]), type: 'line', smooth: true, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0, color:'rgba(102,126,234,0.6)'}, {offset:1, color:'rgba(102,126,234,0)'}]) }, lineStyle: { color: '#667eea', width: 3 }, symbol: 'none' }] });
  
  const browsers: Record<string, number> = {}; const os: Record<string, number> = {};
  viewRecords.value.forEach(r => { browsers[r.browser] = (browsers[r.browser] || 0) + 1; os[r.os] = (os[r.os] || 0) + 1; });
  createChart('device-chart', { tooltip: { trigger: 'item' }, legend: { show: false }, series: [{ name: 'OS', type: 'pie', radius: ['30%', '45%'], data: Object.entries(os).map(([k, v]) => ({ value: v, name: k })), itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 } }, { name: 'Browser', type: 'pie', radius: ['55%', '70%'], data: Object.entries(browsers).map(([k, v]) => ({ value: v, name: k })), itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 } }] });
  
  const wordCloudData = topPages.value.map(p => ({ name: getPageTitle(p.name), value: p.value * 10 }));
  createChart('wordcloud-chart', { series: [{ type: 'wordCloud', shape: 'circle', sizeRange: [12, 40], rotationRange: [-45, 45], gridSize: 8, textStyle: { color: () => 'rgb(' + [Math.round(Math.random() * 160), Math.round(Math.random() * 160), Math.round(Math.random() * 160)].join(',') + ')' }, data: wordCloudData }] });
  
  const dayCounts: Record<string, number> = {};
  allRecords.value.forEach(r => { const day = r.time.split('T')[0]; dayCounts[day] = (dayCounts[day] || 0) + 1; });
  const data = Object.entries(dayCounts).map(([k, v]) => [k, v]);
  const max = Math.max(...Object.values(dayCounts), 5);
  createChart('calendar-chart', { tooltip: { position: 'top' }, visualMap: { min: 0, max, show: false, inRange: { color: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'] } }, calendar: { top: 30, left: 30, right: 30, range: new Date().getFullYear(), itemStyle: { borderWidth: 0.5, borderColor: '#fff' }, yearLabel: { show: false } }, series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }] });
};

const onTimeRangeChange = () => { filterData(); initCharts(); };

onMounted(async () => {
  // 关键：在 onMounted 中才动态导入库并执行所有客户端操作
  try {
    const echartsModule = await import('echarts');
    echarts = echartsModule; // 赋值给全局变量
    await import('echarts-wordcloud');
  } catch(e) {
    console.error("Failed to load charting libraries:", e);
    return; // 如果库加载失败，则不继续执行
  }
  
  isMounted.value = true;
  
  // 必须在 isMounted 变为 true 之后，DOM 元素才存在
  await nextTick();
  
  await recordCurrentVisit();
  filterData();
  initCharts();

  window.addEventListener('resize', () => { chartInstances.forEach(c => c.resize()); });
});
</script>

<style scoped>
/* 新增一个简单的占位符样式 */
.loading-placeholder {
  padding: 40px;
  text-align: center;
  color: #999;
  font-size: 16px;
  background-color: #f9f9f9;
  border-radius: 12px;
}
/* 其他样式与您提供的版本完全相同 */
.visitor-dashboard-final { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #2c3e50; background-color: #f0f2f5; padding: 20px; box-sizing: border-box; min-height: 100vh; }
.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: #fff; padding: 16px 24px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.main-title { font-size: 20px; font-weight: 700; margin: 0; color: #333; }
.subtitle { font-size: 12px; color: #888; margin-left: 8px; }
.time-filter select { padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; outline: none; color: #555; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 12px; padding: 20px; display: flex; align-items: center; box-shadow: 0 4px 16px rgba(0,0,0,0.03); transition: transform 0.2s; position: relative; overflow: hidden; }
.kpi-card:hover { transform: translateY(-3px); }
.kpi-icon { font-size: 28px; margin-right: 16px; background: #f5f5f5; padding: 10px; border-radius: 50%; }
.kpi-content { display: flex; flex-direction: column; }
.kpi-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.kpi-value { font-size: 24px; font-weight: 800; color: #2c3e50; margin-top: 4px; }
.kpi-card.blue .kpi-icon { background: #e6f7ff; } .kpi-card.blue .kpi-value { color: #1890ff; }
.kpi-card.purple .kpi-icon { background: #f9f0ff; } .kpi-card.purple .kpi-value { color: #722ed1; }
.kpi-card.green .kpi-icon { background: #f6ffed; } .kpi-card.green .kpi-value { color: #52c41a; }
.kpi-card.orange { justify-content: center; padding: 10px; }
.kpi-chart-mini { width: 100px; height: 80px; }
.kpi-label-overlay { position: absolute; bottom: 10px; font-size: 12px; color: #888; }
.main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px; }
.grid-col-left, .grid-col-right { display: flex; flex-direction: column; gap: 20px; }
.chart-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); display: flex; flex-direction: column; }
.card-header { margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
.card-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #333; }
.chart-body { height: 300px; width: 100%; }
.chart-body-sm { height: 200px; width: 100%; }
.ranking-list { flex: 1; overflow-y: auto; max-height: 300px; }
.ranking-item { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f9f9f9; }
.rank-badge { width: 20px; height: 20px; background: #eee; border-radius: 4px; text-align: center; line-height: 20px; font-size: 12px; font-weight: bold; color: #666; margin-right: 10px; }
.rank-1 { background: #ffda79; color: #b33939; }
.rank-2 { background: #d1d8e0; color: #4b6584; }
.rank-3 { background: #ffccbc; color: #d84315; }
.rank-info { flex: 1; margin-right: 10px; }
.rank-name { font-size: 13px; color: #333; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.rank-bar-bg { height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
.rank-bar-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 3px; }
.rank-val { font-size: 13px; font-weight: bold; color: #333; }
.empty-state { text-align: center; color: #999; padding: 20px; font-size: 13px; }
@media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .main-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr; } }
</style>