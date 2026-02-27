<template>
  <div class="team-directory">
    <section class="team-hero">
      <img class="team-hero-image" src="/images/main_img/hhu-bridge.png" alt="研究队伍横幅背景" />
      <div class="team-hero-mask"></div>
      <div class="team-hero-content">
        <p class="team-hero-kicker">研究队伍</p>
        <h1>实验室成员</h1>
        <p>"历史会遗忘过客 但不会磨灭先驱"———提利昂 兰尼斯特</p>
      </div>
    </section>

    <section class="team-layout">
      <aside class="team-filter">
        <h2>专业筛选</h2>
        <ul>
          <li v-for="item in centerFilters" :key="item">{{ item }}</li>
        </ul>
      </aside>

      <main class="team-main">
        <div class="team-role-tabs">
          <a v-for="tab in roleTabs" :key="tab.id" :href="`#${tab.id}`">{{ tab.label }}</a>
        </div>

        <section v-for="group in memberGroups" :id="group.id" :key="group.id" class="team-group">
          <div class="team-group-title">
            <h3>{{ group.name }}</h3>
            <p>成员资料将持续补充</p>
          </div>
          <div class="team-member-grid">
            <a v-for="member in group.members" :key="member.link" class="team-member-card" :href="member.link">
              <div class="team-member-avatar">
                <span>{{ member.badge }}</span>
              </div>
              <div class="team-member-body">
                <h4>{{ member.name }}</h4>
                <p class="team-member-title">{{ member.title }}</p>
                <p class="team-member-desc">{{ member.desc }}</p>
              </div>
            </a>
          </div>
        </section>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
interface MemberItem {
  name: string;
  title: string;
  desc: string;
  badge: string;
  link: string;
}

interface MemberGroup {
  id: string;
  name: string;
  members: MemberItem[];
}

const centerFilters = [
  "人工智能",
  "自动化",
  "智能科学与技术",
  "通信",
  "大数据管理与应用",
  "物联网",
];

const roleTabs = [
  { id: "grade-21", label: "21级" },
  { id: "grade-22", label: "22级" },
  { id: "grade-23", label: "23级" },
  { id: "grade-24", label: "24级" },
  { id: "grade-25", label: "25级" },
];

const createMembers = (section: string, label: string, count: number): MemberItem[] =>
  Array.from({ length: count }, (_, index) => {
    const no = String(index + 1).padStart(2, "0");

    return {
      name: `${label}成员 ${no}`,
      title: "信息待更新",
      desc: "个人简介、研究方向与联系方式待补充。",
      badge: `${label.slice(0, 2)}-${no}`,
      link: `/demo/team/${section}/member-${no}.html`,
    };
  });

const memberGroups: MemberGroup[] = [
  {
    id: "grade-21",
    name: "21级",
    members: createMembers("grade-21", "21级", 4),
  },
  {
    id: "grade-22",
    name: "22级",
    members: createMembers("grade-22", "22级", 4),
  },
  {
    id: "grade-23",
    name: "23级",
    members: createMembers("grade-23", "23级", 4),
  },
  {
    id: "grade-24",
    name: "24级",
    members: createMembers("grade-24", "24级", 4),
  },
  {
    id: "grade-25",
    name: "25级",
    members: createMembers("grade-25", "25级", 4),
  },
];
</script>
