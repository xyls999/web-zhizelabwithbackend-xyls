<template>
  <div class="lab-home">
    <section id="home" class="banner">
      <img class="banner-image" src="/images/main_img/light-in-main.jpg" alt="实验室首页横幅" />
      <div class="banner-mask"></div>
      <div class="banner-effects" aria-hidden="true">
        <span
          v-for="(drop, index) in heroRainDrops"
          :key="`drop-${index}`"
          class="rain-drop"
          :style="{
            '--rain-left': drop.left,
            '--rain-delay': drop.delay,
            '--rain-duration': drop.duration,
            '--rain-length': drop.length,
            '--rain-opacity': drop.opacity,
          }"
        ></span>
        <span class="water-wave wave-1"></span>
        <span class="water-wave wave-2"></span>
        <span class="water-wave wave-3"></span>
      </div>

      <div class="title-box">
        <img class="hero-logo" src="/images/logos/zhizelab_logo.png" alt="智泽实验室 Logo" />
        <h1 class="hero-title">河海大学智泽实验室</h1>
        <div class="hero-chip-list">
          <span v-for="tag in heroTags" :key="tag">{{ tag }}</span>
        </div>
        <div class="hero-actions">
          <a href="/demo/" class="hero-main-action">了解更多</a>
          <a href="/join-us" class="hero-sub-action">加入我们</a>
        </div>
      </div>

      <button type="button" class="hero-explore-hub" @click="scrollToSection('about')" aria-label="explore zhize lab">
        <span class="explore-shape" aria-hidden="true"></span>
        <span class="explore-body">探索</span>
      </button>
    </section>

    <section id="about" class="mode mode-about">
      <div class="mode-header">
        <h2>关于实验室</h2>
        <a href="/demo/">了解更多</a>
      </div>
      <div class="mode-about-layout">
        <article class="mode-panel intro-text">
          <p class="intro-lead">
            智泽实验室依托河海大学学科优势，围绕“人工智能 + 行业场景”开展持续研究与工程实践，强调从理论到落地的完整闭环。
          </p>
          <p>
            团队以真实问题为牵引，聚焦智慧水利、计算机视觉、机器人系统与工程部署，构建从数据治理、模型训练到系统迭代的全流程能力，
            让科研成果在真实场景中可验证、可复用、可扩展。
          </p>
          <ul class="about-points">
            <li>方向聚焦：人工智能应用、嵌入式系统、ROS 机器人与工程化开发</li>
            <li>组织方式：项目驱动 + 比赛训练 + 技术分享，形成稳定成长路径</li>
            <li>能力目标：解决复杂场景问题，提升成员独立研发与协同交付能力</li>
          </ul>
        </article>
        <aside class="mode-panel about-visual">
          <figure class="about-figure">
            <img src="/images/join-us_img/DSC_4034.JPG" alt="智泽实验室研讨交流" />
            <figcaption>实验室合照</figcaption>
          </figure>
        </aside>
      </div>
    </section>

    <section id="research-activity" class="mode mode-research section-main-dark">
      <div class="mode-header">
        <h2>学习研究与比赛活动</h2>
        <a href="/demo/success">查看全部</a>
      </div>
      <div class="research-activity-layout">
        <div class="research-grid">
          <a v-for="item in researchItems" :key="item.title" class="research-card" :href="item.link">
            <img :src="item.image" :alt="item.title" />
            <span class="research-tag">{{ item.tag }}</span>
            <span class="research-title">{{ item.title }}</span>
            <p class="research-desc">{{ item.desc }}</p>
          </a>
        </div>
        <aside class="mode-panel activity-timeline">
          <h3 class="panel-title">近期活动</h3>
          <ul>
            <li v-for="item in activityItems" :key="item.title">
              <p class="activity-date">{{ item.date }}</p>
              <h4>{{ item.title }}</h4>
              <p class="activity-place">{{ item.place }}</p>
              <a :href="item.link">查看详情</a>
            </li>
          </ul>
        </aside>
      </div>
    </section>

    <section id="gallery" class="mode mode-gallery">
      <div class="mode-header">
        <h2>光影记录</h2>
        <a href="/join-us">更多记录</a>
      </div>
      <div class="gallery-grid">
        <a v-for="item in galleryItems" :key="item.image" class="gallery-card" :href="item.link">
          <img :src="item.image" :alt="item.title" />
          <span>{{ item.title }}</span>
        </a>
      </div>
    </section>

    <footer class="lab-footer">
      <div class="footer-brand">
        <img src="/images/logos/zhizelab_logo_s.png" alt="智泽实验室图标" />
        <p>河海大学智泽实验室</p>
      </div>
      <div class="footer-links">
        <a v-for="item in footerLinks" :key="item.title" :href="item.link">{{ item.title }}</a>
      </div>
      <div class="footer-contact">
        <p>联系邮箱：zhizelab@hhu.edu.cn（待确认）</p>
        <p>联系电话：025-0000 0000（待确认）</p>
        <p>地址：江苏省南京市西康路 1 号（待确认）</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

let modeObserver: IntersectionObserver | null = null;

const initModeTurnAnimation = (): void => {
  const modes = Array.from(document.querySelectorAll<HTMLElement>(".lab-home .mode"));
  if (!modes.length || typeof window.IntersectionObserver === "undefined") return;

  modeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          element.classList.add("mode-visible");
        } else if (entry.boundingClientRect.top > 0) {
          element.classList.remove("mode-visible");
        }
      });
    },
    {
      threshold: [0.2, 0.38, 0.58],
      rootMargin: "-5% 0px -10% 0px",
    },
  );

  modes.forEach((mode) => modeObserver?.observe(mode));
};

const scrollToSection = (id: string): void => {
  const element = document.getElementById(id);
  if (!element) return;

  if (id === "home") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const navbar = document.querySelector<HTMLElement>(".vp-navbar");
  const offset = navbar?.offsetHeight ?? 70;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
};

onMounted(() => {
  initModeTurnAnimation();
});

onBeforeUnmount(() => {
  if (modeObserver) {
    modeObserver.disconnect();
    modeObserver = null;
  }
});

const heroTags = ["人工智能应用", "工程部署", "嵌入式", "ROS机器人", "大模型"];

const heroRainDrops = Array.from({ length: 44 }, (_, index) => {
  const left = (index * 17.3) % 100;
  return {
    left: `${left.toFixed(2)}%`,
    delay: `${((index * 0.19) % 6.2).toFixed(2)}s`,
    duration: `${(2.35 + (index % 8) * 0.21).toFixed(2)}s`,
    length: `${8 + (index % 8) * 2.6}px`,
    opacity: `${(0.23 + (index % 5) * 0.1).toFixed(2)}`,
  };
});

const metricItems = [
  { value: "12+", label: "在研课题" },
  { value: "6", label: "核心方向" },
  { value: "20+", label: "合作单位" },
  { value: "40+", label: "年度活动" },
];

const researchItems = [
  {
    title: "中国软件杯挑战赛",
    tag: "Research",
    desc: "构建机器狗在复杂环境中的自主导航与任务执行能力。",
    image: "/images/join-us_img/DSC_5924-已增强-降噪-scaled.jpg",
    link: "/demo/success",
  },
  {
    title: "智慧社区算法精英赛",
    tag: "Perception",
    desc: "结合真实场景的计算机视觉和机器人应用",
    image: "/images/join-us_img/2025_AIC_group_total.jpg",
    link: "/demo/success",
  },
  {
    title: "全国服务外包大赛",
    tag: "Model",
    desc: "构建完善的社区识别体系与智能化应用。",
    image: "/images/join-us_img/IMG_20251219_144019.jpg",
    link: "/demo/success",
  },
  {
    title: "计算机设计大赛",
    tag: "Engineering",
    desc: "面向计算机的算法与系统设计竞赛，推动技术落地与创新。",
    image: "/images/join-us_img/computer desgin.jpg",
    link: "/demo/success",
  },
];

const activityItems = [
  { date: "2025-12-30", title: "智慧社区比赛完赛", place: "江阴", link: "/demo/resources/ROStrain" },
  { date: "2026-01-18", title: "寒假学习计划与任务分配", place: "河海大学", link: "/demo/success"},
  { date: "2026-03-02", title: "寒假学习成果验收", place: "河海大学", link: "/demo/success" },
];

const galleryItems = [
  { title: "实验室团队", image: "/images/join-us_img/2025_AIC_group_total.jpg", link: "/join-us" },
  { title: "校园风景", image: "/images/main_img/hhu-bridge.png", link: "/demo/success" },
  { title: "技术交流", image: "/images/join-us_img/IMG_20251219_143906.jpg", link: "/join-us" },
  { title: "比赛记录", image: "/images/join-us_img/IMG_20251219_141930.jpg", link: "/demo/resources/" },
  { title: "活动剪影", image: "/images/join-us_img/IMG_20251219_143946.jpg", link: "/join-us" },
  { title: "团队合作", image: "/images/join-us_img/IMG_20251219_144019.jpg", link: "/join-us" },
];

const footerLinks = [
  { title: "首页", link: "/" },
  { title: "关于实验室", link: "/demo/" },
  { title: "成员名录", link: "/demo/members-list" },
  { title: "资源库", link: "/demo/resources/" },
  { title: "加入我们", link: "/join-us" },
];
</script>
