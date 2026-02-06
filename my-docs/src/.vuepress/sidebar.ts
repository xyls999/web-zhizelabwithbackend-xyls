import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    "portfolio",
    "join-us",
    {
      text: "关于实验室",
      icon: "laptop-code",
      prefix: "demo/",
      link: "demo/",
      children: [
        {
          text: "成员名录",
          icon: "address-book",
          link: "members-list",
          
        },
        {
          text: "成果展示",
          icon: "trophy",
          link: "success",
        },
        {
          text: "ROS培训",
          icon: "robot",
          prefix: "ROStrain/",
          link: "ROStrain/",
          collapsible: true,
          expanded: false,
              children: [
                "environment",
                "nav",
                "imageProcessing",
                "visionTraining",
              ],
        },
        {
          text: "硬件培训",
          icon: "plug",
          prefix: "HardWare/",
          link: "HardWare/",
          children: [

          ],
        }
      ],
    },
    {
      text: "文档",
      icon: "book",
      prefix: "guide/",
      children: "structure",
    },
    {
      text: "幻灯片",
      icon: "person-chalkboard",
      link: "https://ecosystem.vuejs.press/zh/plugins/markdown/revealjs/demo.html",
    },
  ],
});
